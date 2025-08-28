import { Component, NO_ERRORS_SCHEMA, OnDestroy, OnInit } from "@angular/core";
import { NativeScriptCommonModule } from "@nativescript/angular";
import { Router, NavigationEnd } from "@angular/router";
import { Canvas } from "@nativescript/canvas";
import { Screen } from "@nativescript/core";
import { AppRenderer } from "../renderer/AppRenderer";
import { AppScene } from "../scenes/AppScene";
import { filter } from 'rxjs/operators';

@Component({
  selector: "app-canvas",
  template: `
    <ActionBar title="Apple Event Logo Animation" class="action-bar">
      <ActionItem text="Controls" (tap)="openControls()" ios.position="right" android.position="actionBar"></ActionItem>
    </ActionBar>
    <GridLayout backgroundColor="#000000">
      <Canvas backgroundColor="#000000" width="100%" height="100%" (ready)="onCanvasReady($event)" (touch)="onTouch($event)"></Canvas>
    </GridLayout>
  `,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
  styles: [`
    .action-bar {
      background-color: #007bff;
      color: white;
    }
  `]
})
export class CanvasComponent implements OnDestroy {
  private appRenderer?: AppRenderer;
  private appScene?: AppScene;
  private canvas?: Canvas;

  constructor(private router: Router) {}

  openControls() {
    this.router.navigate(['/controls']);
  }

  onCanvasReady(event: any) {
    console.log('Canvas ready event triggered');
    
    try {
      this.canvas = event.object as Canvas;

      console.log(`Canvas object:`, this.canvas);
      console.log(`Canvas client dimensions: ${this.canvas.clientWidth}x${this.canvas.clientHeight}`);
      
      // Set canvas dimensions
      this.canvas.width = this.canvas.clientWidth * Screen.mainScreen.scale;
      this.canvas.height = this.canvas.clientHeight * Screen.mainScreen.scale;

      console.log(`Canvas actual dimensions: ${this.canvas.width}x${this.canvas.height}`);

      // Get WebGL context with fallbacks
      let ctx: any = null;
      
      try {
        ctx = this.canvas.getContext("webgl2");
        console.log("WebGL2 context:", ctx ? "SUCCESS" : "FAILED");
      } catch (e) {
        console.log("WebGL2 error:", e);
      }

      console.log("WebGL context obtained successfully");
      this.setupAppleAnimation(ctx);
      
    } catch (error) {
      console.error("Error in canvas setup:", error);
    }
  }

  private async setupAppleAnimation(ctx: any) {
    try {
      console.log("Setting up Apple Event animation...");

      // Create the app renderer
      this.appRenderer = new AppRenderer(ctx, this.canvas!.width, this.canvas!.height);
      console.log("AppRenderer created");

      // Create the app scene
      this.appScene = new AppScene(this.appRenderer);
      console.log("AppScene created");

      // Connect renderer and scene
      this.appRenderer.setScene(this.appScene);
      this.appRenderer.setCamera(this.appScene.camera);

      // Set up the animation loop
      this.appRenderer.onUpdate = (dt) => this.appScene!.update(dt);

      // Initialize the scene (load assets, create materials)
      await this.appScene.init();
      console.log("AppScene initialized");

      console.log("Apple Event animation setup complete!");
      
    } catch (error) {
      console.error("Error setting up Apple animation:", error);
    }
  }

  onTouch(event: any) {
    if (!this.appScene || !this.canvas) return;

    try {
      const action = event.action;
      const x = event.getX();
      const y = event.getY();

      // Convert screen coordinates to normalized coordinates (0-1)
      const normalizedX = x / this.canvas.clientWidth;
      const normalizedY = y / this.canvas.clientHeight;

      // Check for debug mode toggle (tap in top-left corner)
      if (action === 'up' && normalizedX < 0.1 && normalizedY < 0.1) {
        this.appScene.toggleDebugMode();
        return;
      }

      // Determine if touch is active
      const isActive = action === 'down' || action === 'move';

      // Update scene with touch position
      this.appScene.updateTouchPosition(normalizedX, normalizedY, isActive);
      
    } catch (error) {
      console.error("Error handling touch:", error);
    }
  }

  ngOnDestroy() {
    try {
      if (this.appScene) {
        this.appScene.dispose();
        this.appScene = undefined;
      }

      if (this.appRenderer) {
        this.appRenderer.dispose();
        this.appRenderer = undefined;
      }

      console.log("Canvas component cleanup complete");
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  }
}
