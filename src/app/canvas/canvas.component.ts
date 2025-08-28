import { Component, inject, NO_ERRORS_SCHEMA, OnDestroy } from "@angular/core";
import { NativeDialog, NativeScriptCommonModule } from "@nativescript/angular";
import { Canvas } from "@nativescript/canvas";
import { Color, Page, Screen } from "@nativescript/core";
import { AppRenderer } from "../renderer/AppRenderer";
import { AppScene } from "../scenes/AppScene";
import { ControlsComponent } from "../controls/controls.component";

@Component({
  selector: "app-canvas",
  template: `
    <GridLayout rows="auto,*">
      <GridLayout columns="*,auto" class="bg-black py-3" iosOverflowSafeArea="true">
        <Label
          colSpan="2"
          text="Apple Thermal Logo"
          class="text-center text-white font-bold"
        ></Label>

        <Label
          col="1"
          text="Controls"
          (tap)="openControls()"
          class="text-white mr-3"
        ></Label>
      </GridLayout>
      <GridLayout row="1" backgroundColor="#000">
        <Canvas
          backgroundColor="#000"
          width="100%"
          height="100%"
          (ready)="onCanvasReady($event)"
          (touch)="onTouch($event)"
        ></Canvas>
        <ContentView class="align-top h-[165] w-full bg-[#0d0b0b]"></ContentView>
        <ContentView
          class="align-bottom h-[185] w-full bg-[#0d0b0b]"
        ></ContentView>
      </GridLayout>
    </GridLayout>
  `,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
  styles: [
    `
      .action-bar {
        background-color: #007bff;
        color: white;
      }
    `,
  ],
})
export class CanvasComponent implements OnDestroy {
  nativeDialog = inject(NativeDialog);
  private appRenderer?: AppRenderer;
  private appScene?: AppScene;
  private canvas?: Canvas;
  private page = inject(Page);

  constructor() {
    // Set black status bar on android
    if (__ANDROID__) {
       this.page.androidStatusBarBackground = new Color("#000000");
    }
  }


  openControls() {
    this.appScene.pause();
    const ref = this.nativeDialog.open(ControlsComponent, {
      nativeOptions: {
        fullscreen: __ANDROID__,
      },
    });
    ref.afterClosed().subscribe(() => {
      setTimeout(() => {
        this.appScene.replay();
      }, 600);
    });
  }

  onCanvasReady(event: any) {
    console.log("Canvas ready event triggered");

    try {
      this.canvas = event.object as Canvas;

      console.log(`Canvas object:`, this.canvas);
      console.log(
        `Canvas client dimensions: ${this.canvas.clientWidth}x${this.canvas.clientHeight}`
      );

      // Set canvas dimensions
      this.canvas.width = this.canvas.clientWidth * Screen.mainScreen.scale;
      this.canvas.height = this.canvas.clientHeight * Screen.mainScreen.scale;

      console.log(
        `Canvas actual dimensions: ${this.canvas.width}x${this.canvas.height}`
      );

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
      this.appRenderer = new AppRenderer(
        ctx,
        this.canvas!.width,
        this.canvas!.height
      );
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
      if (action === "up" && normalizedX < 0.1 && normalizedY < 0.1) {
        this.appScene.toggleDebugMode();
        return;
      }

      // Determine if touch is active
      const isActive = action === "down" || action === "move";

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
