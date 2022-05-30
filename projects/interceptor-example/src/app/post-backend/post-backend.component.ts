import { Component, OnInit } from '@angular/core';
import { Result } from '../result';
import { ExampleService } from '../example.service';
import { OpenTelemetrySimpleTraceService } from 'projects/opentelemetry-interceptor/src/lib/services/instrumentation/opentelemetry-simple-trace.service';

@Component({
  selector: 'app-post-backend',
  templateUrl: './post-backend.component.html',
  styleUrls: ['./post-backend.component.css'],
})
export class PostBackendComponent implements OnInit {
  public result: Result;

  constructor(
    private exampleService: ExampleService,
    private otelSimpleTracerService: OpenTelemetrySimpleTraceService
  ) {

  }

  ngOnInit(): void {}

  onSubmit(resultForm): void {

    let currentSpan = this.otelSimpleTracerService.startSpan("PostBackendComponent.onSubmit", { "custom-test": "sample" });

    setTimeout(() => {
      currentSpan.end();
    }, 500)

    const oneResult: Result = new Result(resultForm.avalue);
    this.exampleService
      .postApiBackend(oneResult)
      .subscribe((result) => { 
        currentSpan.addEvent("postApiBackend:result", { "result": JSON.stringify(result) })
        return (this.result = result) 
      });
  }
}
