import {
  bootstrapApplication,
  provideNativeScriptHttpClient,
  provideNativeScriptRouter,
  registerElement,
  runNativeScriptAngularApp,
} from '@nativescript/angular';
import { provideZonelessChangeDetection } from '@angular/core';
import { withInterceptorsFromDi } from '@angular/common/http';
import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { Canvas } from '@nativescript/canvas';
import '@nativescript/canvas-polyfill';
import '@nativescript/canvas-three';
import { Utils } from '@nativescript/core';

// Canvas.forceGL = true;
Canvas.useSurface = true;

registerElement('Canvas', () => Canvas);
registerElement("Slider", () => require("./app/ui/slider/index").Slider);

runNativeScriptAngularApp({
  appModuleBootstrap: () => {
    if (__APPLE__) {
      Utils.ios.setWindowBackgroundColor('#000');
    }
    return bootstrapApplication(AppComponent, {
      providers: [
        provideNativeScriptHttpClient(withInterceptorsFromDi()),
        provideNativeScriptRouter(routes),
        provideZonelessChangeDetection(),
      ],
    });
  },
});