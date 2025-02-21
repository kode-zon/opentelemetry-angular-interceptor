import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppComponent } from './app.component';
import { HttpClientModule, HttpClientJsonpModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
// eslint-disable-next-line max-len
import { OpenTelemetryBasicSpanModule, OTEL_LOGGER, OtelColExporterModule, CompositePropagatorModule } from 'projects/opentelemetry-interceptor/src/public-api';
import { environment } from '../environments/environment';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ViewBackendComponent } from './view-backend/view-backend.component';
import { HighlightJsModule } from 'ngx-highlight-js';
import { AppRoutingModule } from './app-routing.module';
import { PostBackendComponent } from './post-backend/post-backend.component';
import { JsonpBackendComponent } from './jsonp-backend/jsonp-backend.component';
import { LoggerModule, NGXLogger } from 'ngx-logger';
import { OTEL_CUSTOM_SPAN } from '../../../opentelemetry-interceptor/src/lib/configuration/opentelemetry-config';
import { CustomSpanImpl } from './custom-span-impl';
import { AppDemoHttpInterceptor } from './app-demo-http.intercepter';

@NgModule({
  declarations: [AppComponent, ViewBackendComponent, PostBackendComponent, JsonpBackendComponent],
  imports: [
    BrowserModule,
    // Insert module OpenTelemetryInterceptorModule with configuration, HttpClientModule is used for interceptor
    OpenTelemetryBasicSpanModule.forRoot(environment.openTelemetryConfig),
    OtelColExporterModule,
    CompositePropagatorModule,
    HttpClientModule,
    HttpClientJsonpModule,
    FormsModule,
    MatToolbarModule,
    MatCardModule,
    MatFormFieldModule,
    MatMenuModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    BrowserAnimationsModule,
    HighlightJsModule,
    AppRoutingModule,
    // Insert a logger (NGXLogger for this example...)
    LoggerModule.forRoot(environment.loggerConfig),
  ],
  providers: [
    // Provide token OTEL_LOGGER with the NGXLogger
    { provide: OTEL_LOGGER, useExisting: NGXLogger },
    { provide: OTEL_CUSTOM_SPAN, useClass: CustomSpanImpl},
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AppDemoHttpInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }
