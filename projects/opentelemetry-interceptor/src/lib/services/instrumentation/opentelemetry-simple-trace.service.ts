import { Injectable, Inject, Optional } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpResponse,
  HttpErrorResponse
} from '@angular/common/http';
import { PlatformLocation } from '@angular/common';
import { Observable } from 'rxjs';
import * as api from '@opentelemetry/api';
import { Sampler, Span, SpanStatusCode, DiagLogger, Attributes, Exception } from '@opentelemetry/api';
import { WebTracerProvider, StackContextManager } from '@opentelemetry/sdk-trace-web';
import {
  SimpleSpanProcessor,
  ConsoleSpanExporter,
  BatchSpanProcessor,
  NoopSpanProcessor,
  BufferConfig
} from '@opentelemetry/sdk-trace-base';
import {
  AlwaysOnSampler,
  AlwaysOffSampler,
  TraceIdRatioBasedSampler,
  ParentBasedSampler,
} from '@opentelemetry/core';
import { SemanticResourceAttributes, SemanticAttributes } from '@opentelemetry/semantic-conventions';
import { Resource } from '@opentelemetry/resources';
import { tap, finalize } from 'rxjs/operators';
import {
  OpenTelemetryConfig,
  OTEL_CONFIG,
} from '../../configuration/opentelemetry-config';
import { version, name } from '../../../version.json';
import { OTEL_EXPORTER, IExporter } from '../exporter/exporter.interface';
import { OTEL_PROPAGATOR, IPropagator } from '../propagator/propagator.interface';
import { OTEL_LOGGER, OTEL_CUSTOM_SPAN } from '../../configuration/opentelemetry-config';
import { stringify } from 'querystring';


export interface SpanWrapOperation {
    (doSpanEnd:(ret?:any)=>any, doSpanErr:(err:Exception)=>any, doSpanEvent:(eventName:string, attr?:Attributes)=>any):any
}

@Injectable({
  providedIn: 'root',
})
export class OpenTelemetrySimpleTraceService {
  /**
   * tracer
   */
  tracer: WebTracerProvider;
  /**
   * context manager
   */
  contextManager: StackContextManager;
  /**
   * Log or not body
   */
  logBody = false;

  /**
   * constructor
   *
   * @param config configuration
   * @param exporterService service exporter injected
   * @param propagatorService propagator injected
   * @param logger define logger
   * @param customSpan a customSpan interface to add attributes
   * @param platformLocation encapsulates all calls to DOM APIs
   */
  constructor(
    @Inject(OTEL_CONFIG) private config: OpenTelemetryConfig,
    @Inject(OTEL_EXPORTER)
    private exporterService: IExporter,
    @Inject(OTEL_PROPAGATOR)
    private propagatorService: IPropagator,
    @Optional() @Inject(OTEL_LOGGER)
    private logger: DiagLogger,
    private platformLocation: PlatformLocation
  ) {
    this.tracer = new WebTracerProvider({
      sampler: this.defineProbabilitySampler(this.convertStringToNumber(config.commonConfig.probabilitySampler)),
      resource: Resource.default().merge(
        new Resource({
          [SemanticResourceAttributes.SERVICE_NAME]: this.config.commonConfig.serviceName,
        })
      ),
    });
    this.insertOrNotSpanExporter();
    this.contextManager = new StackContextManager();
    this.tracer.register({
      propagator: this.propagatorService.getPropagator(),
      contextManager: this.contextManager
    });
    this.logBody = config.commonConfig.logBody;
    api.diag.setLogger(logger, config.commonConfig.logLevel);

  }


  public doSpanZone(spanName:string, attr:Attributes|undefined, operation:SpanWrapOperation) {

      this.contextManager.disable(); //FIX - reinit contextManager for each http call
      this.contextManager.enable();
      const span: Span = this.startSpan(spanName, attr);
      span.setStatus({
          code: SpanStatusCode.UNSET
      });
      operation(
          (ret?:any) => {
              span.end();
              this.contextManager.disable();
          },
          (err:Exception) => {
              span.recordException({
                  name: 'error',
                  message: 'error',
                  stack: err.toString()
              });
              span.setStatus({
                  code: SpanStatusCode.ERROR
              });
          },
          (eventName:string, attr?:Attributes ) => {
              if(attr != undefined) {
                  span.addEvent(eventName, attr);
              } else {
                  span.addEvent(eventName);
              }
          }
      )
  }

  public startSpan(spanName:string, attr?: Attributes): Span {
    return this.initSpan(spanName, attr);
  }


  private initSpan(spanName:string, attr?: Attributes, spanKind?:api.SpanKind): Span {
    
    const span = this.tracer
      .getTracer(name, version)
      .startSpan(
        spanName,
        {
          attributes: {
            [SemanticAttributes.CODE_NAMESPACE]: 'unknown' /* TODO: use caller name from stackTrace */,
            [SemanticAttributes.CODE_FUNCTION]: 'unknown',
            [SemanticAttributes.CODE_FILEPATH]: 'unknown',
            [SemanticAttributes.CODE_LINENO]: 'unknown',
            [SemanticAttributes.HTTP_USER_AGENT]: window.navigator.userAgent,
            ...attr
          },
          kind: (spanKind)??api.SpanKind.CLIENT,
        },
        this.contextManager.active()
      );
    /*eslint no-underscore-dangle: ["error", { "allow": ["_currentContext"] }]*/
    this.contextManager._currentContext = api.trace.setSpan(
      this.contextManager.active(),
      span
    );
    return span;
  }

  /**
   * Verify to insert or not a Span Exporter
   */
  private insertOrNotSpanExporter() {
    if(this.exporterService.getExporter()!==undefined) {
      this.insertSpanProcessorProductionMode();
      this.insertConsoleSpanExporter();
    } else {
      this.tracer.addSpanProcessor(new NoopSpanProcessor());
    }
  }

  /**
   * Insert in tracer the console span if config is true
   */
  private insertConsoleSpanExporter() {
    if (this.config.commonConfig.console) {
      this.tracer.addSpanProcessor(
        new SimpleSpanProcessor(new ConsoleSpanExporter())
      );
    }
  }

  /**
   * Insert BatchSpanProcessor in production mode
   * SimpleSpanProcessor otherwise
   */
  private insertSpanProcessorProductionMode() {
    const bufferConfig: BufferConfig = {
      maxExportBatchSize: this.convertStringToNumber(this.config.batchSpanProcessorConfig?.maxExportBatchSize),
      scheduledDelayMillis: this.convertStringToNumber(this.config.batchSpanProcessorConfig?.scheduledDelayMillis),
      exportTimeoutMillis: this.convertStringToNumber(this.config.batchSpanProcessorConfig?.exportTimeoutMillis),
      maxQueueSize: this.convertStringToNumber(this.config.batchSpanProcessorConfig?.maxQueueSize)
    };
    this.tracer.addSpanProcessor(
      this.config.commonConfig.production
        ? new BatchSpanProcessor(this.exporterService.getExporter(), bufferConfig)
        : new SimpleSpanProcessor(this.exporterService.getExporter())
    );
  }

  /**
   * define the Probability Sampler
   * By Default, it's always (or 1)
   *
   * @param sampleConfig the sample configuration
   */
  private defineProbabilitySampler(sampleConfig: number): Sampler {
    if (sampleConfig >= 1) {
      return new ParentBasedSampler({ root: new AlwaysOnSampler() });
    }
    else if (sampleConfig <= 0 || sampleConfig === undefined) {
      return new ParentBasedSampler({ root: new AlwaysOffSampler() });
    } else {
      return new ParentBasedSampler({ root: new TraceIdRatioBasedSampler(sampleConfig) });
    }
  }

  /**
   * convert String to Number (or undefined)
   *
   * @param value
   * @returns number or undefined
   */
  private convertStringToNumber(value: string): number {
    return value !== undefined ? Number(value) : undefined;
  }
}
