import { ClassProvider, ConstructorProvider, ExistingProvider, FactoryProvider, InjectionToken, ValueProvider } from '@angular/core';
import { DiagLogger, SpanAttributes, DiagLogLevel } from '@opentelemetry/api';
import { InstrumentationOption } from '@opentelemetry/instrumentation';
import { CustomSpan } from '../interceptor/custom-span.interface';

/**
 * Common configuration
 */
export interface CommonCollectorConfig {
  /** serviceName : Name of service in trace */
  serviceName: string;
  /** console : boolean to trace in console */
  console?: boolean;
  /** production : boolean to use a BatchSpanExporter(async) or SimpleSpanExporter(sync) */
  production?: boolean;
  /** probabilitySampler */
  probabilitySampler?: string;
  /** log or not body response in span */
  logBody?: boolean;
  /** log level for opentelemetry */
  logLevel?: DiagLogLevel;
}

/**
 * BatchSpanExporter Configuration
 */
export interface BatchSpanProcessorConfig {
  /** The maximum queue size. After the size is reached spans are dropped. */
  maxQueueSize?: string;
  /** The maximum batch size of every export. It must be smaller or equal to maxQueueSize. */
  maxExportBatchSize?: string;
  /** The interval between two consecutive exports */
  scheduledDelayMillis?: string;
  /** How long the export can run before it is cancelled */
  exportTimeoutMillis?: string;
}

/**
 * OpenTelemetry Collector configuration
 */
export interface OtelCollectorConfig {
  /**
   * An url (Default value: http://localhost:4318/v1/trace)
   */
  url?: string;
  /**
   * custom headers
   */
  headers?: Partial<Record<string, unknown>>;
  /**
   * attributes : define some custom attributes
   */
  attributes?: SpanAttributes;
  /**
   * An optional limit on pending requests
   */
  concurrencyLimit?: string;
}

/**
 * Configuration for Zipkin
 */
export interface ZipkinCollectorConfig {
  /**
   * An url (Default value: http://localhost:9411/api/v2/spans)
   */
  url?: string;
  /**
   * custom headers
   */
  headers?: {
    [key: string]: string;
  };
}

/**
 * Configuration for JaegerPropagatorConfig
 */
export interface JaegerPropagatorConfig {
  /**
   * A custom Header for the propagator
   */
  customHeader?: string;
}

/**
 * Configuration for B3PropagatorConfig
 */
export interface B3PropagatorConfig {
  /**
   * Single or Multi Header for b3propagator (default: multi)
   * Value : 'O' (single), '1' (multi)
   */
  multiHeader?: string;
}
/**
 * OpenTelemetryConfig
 */
export interface OpenTelemetryConfig {
  /** commonConfig */
  commonConfig: CommonCollectorConfig;
  /** batchSpanProcessorConfig */
  batchSpanProcessorConfig?: BatchSpanProcessorConfig;
  /** otelcolConfig */
  otelcolConfig?: OtelCollectorConfig;
  /** zipkinConfig */
  zipkinConfig?: ZipkinCollectorConfig;
  /** jaegerPropagatorConfig */
  jaegerPropagatorConfig?: JaegerPropagatorConfig;
  /** b3PropagatorConfig */
  b3PropagatorConfig?: B3PropagatorConfig;
}

/** OTEL_CONFIG : Config injection */
export const OTEL_CONFIG = new InjectionToken<OpenTelemetryConfig>('opentelemetry.config');

/** Logger : injection for a logger compatible */
export const OTEL_LOGGER = new InjectionToken<DiagLogger>('otelcol.logger');

/** custom span */
export const OTEL_CUSTOM_SPAN = new InjectionToken<CustomSpan>('otelcol.custom-span');

export const OTEL_INSTRUMENTATION_PLUGINS = new InjectionToken<InstrumentationOption[]>('otelcol.instrumentation.plugins');

export const defineConfigProvider = (
  config: OpenTelemetryConfig | null | undefined,
  configProvider: ValueProvider | ClassProvider | ConstructorProvider | ExistingProvider | FactoryProvider
  ): ValueProvider | ClassProvider | ConstructorProvider | ExistingProvider | FactoryProvider => {
  if(config) {
    configProvider = { provide: OTEL_CONFIG, useValue: config };
  } else {
    if(configProvider) {
      if(configProvider.provide !== OTEL_CONFIG) {
        throw new Error(`Configuration error. token must be : ${OTEL_CONFIG} ,  your token value is : ${configProvider.provide}`);
      }
    } else {
      throw new Error(`Configuration error. you must specify a configuration in config or configProvider`);
    }
  }
  return configProvider;
};
