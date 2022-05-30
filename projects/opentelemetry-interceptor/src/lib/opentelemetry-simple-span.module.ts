import {
  NgModule,
  ModuleWithProviders,
  Optional,
  SkipSelf,
  ValueProvider,
  ClassProvider,
  ConstructorProvider,
  ExistingProvider,
  FactoryProvider,
} from '@angular/core';
import {
  defineConfigProvider,
  OpenTelemetryConfig,
} from './configuration/opentelemetry-config';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { OpenTelemetryHttpInterceptor } from './interceptor/opentelemetry-http.interceptor';
import { OpenTelemetrySimpleTraceService } from './services/instrumentation/opentelemetry-simple-trace.service';


@NgModule({
  declarations: [],
  imports: [HttpClientModule],
  exports: [],
})
export class OpenTelemetrySimpleSpanModule {
  constructor(
    @Optional() @SkipSelf() parentModule?: OpenTelemetrySimpleSpanModule
  ) {
    if (parentModule) {
      throw new Error(
        'OpenTelemetrySimpleSpanModule is already loaded. Import it in the AppModule only'
      );
    }
  }

  public static forRoot(
    config: OpenTelemetryConfig | null | undefined,
    configProvider?: ValueProvider | ClassProvider | ConstructorProvider | ExistingProvider | FactoryProvider
    ): ModuleWithProviders<OpenTelemetrySimpleSpanModule> {

      configProvider = defineConfigProvider(config,configProvider);

    return {
      ngModule: OpenTelemetrySimpleSpanModule,
      providers: [
        configProvider,
        OpenTelemetrySimpleTraceService
      ],
    };
  }

}
