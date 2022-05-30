import { HttpErrorResponse, HttpEvent, HttpHandler, HttpHeaders, HttpInterceptor, HttpRequest, HttpResponse } from "@angular/common/http";
import { Injectable } from "@angular/core";
import * as otel from "@opentelemetry/api";
import { SpanStatusCode } from "@opentelemetry/api";
import { OpenTelemetrySimpleTraceService } from "projects/opentelemetry-interceptor/src/lib/services/instrumentation/opentelemetry-simple-trace.service";
import { Observable } from "rxjs";
import { catchError, finalize, map, tap } from "rxjs/operators";
import { SemanticResourceAttributes, SemanticAttributes } from '@opentelemetry/semantic-conventions';

/**
 * This class will automatic add JWT token(if exists) to header for all http request.
 */
 @Injectable({
    providedIn: 'root'
})
export class AppDemoHttpInterceptor implements HttpInterceptor {

    logBody = true;

    constructor(
        private otelSimpleTracerService: OpenTelemetrySimpleTraceService
    ) {

    }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        

        let modHeader = {};
        modHeader["messageDt"] = "" + new Date();
        let interceptedReq = req.clone({
            headers: new HttpHeaders(modHeader)
          });

        let currentSpan = this.otelSimpleTracerService.startSpan(interceptedReq.url);

        return next.handle(interceptedReq).pipe(
            map(httpEvent => {  currentSpan.addEvent("http.status:" + httpEvent["status"]);  return httpEvent; }),
            tap(
                (event: HttpResponse<any>) => {
                    currentSpan.setAttributes(
                        {
                        [SemanticAttributes.HTTP_STATUS_CODE]: event.status,
                        }
                    );
                    if (this.logBody && event.body != null) {
                        currentSpan.addEvent('response', { body: JSON.stringify(event.body) });
                    }
                    currentSpan.setStatus({
                        code: SpanStatusCode.UNSET
                    });
                },
                (event: HttpErrorResponse) => {
                    currentSpan.setAttributes(
                        {
                        [SemanticAttributes.HTTP_STATUS_CODE]: event.status,
                        }
                    );
                    currentSpan.recordException({
                        name: event.name,
                        message: event.message,
                        stack: event.error
                    });
                    currentSpan.setStatus({
                        code: SpanStatusCode.ERROR
                    });
                }
            ),
            finalize(() => {
                currentSpan.end();
            })
        );
    }
}