import { Component, inject, NO_ERRORS_SCHEMA } from "@angular/core";
import { Router } from "@angular/router";
import { ApplicationSettings } from "@nativescript/core";
import { NativeDialogRef, NativeScriptCommonModule } from "@nativescript/angular";

@Component({
  selector: "app-controls",
  imports: [NativeScriptCommonModule],
  template: `
    <ScrollView>
      <StackLayout class="p-4 bg-black">
        <!-- Effect Intensity -->
        <StackLayout class="control-group mb-4">
          <Label text="Effect Intensity" class="control-label"></Label>
          <Slider
            [value]="controls.effectIntensity"
            minValue="0"
            maxValue="3"
            step="0.1"
            (valueChange)="onEffectIntensityChange($event)"
            class="slider"
          >
          </Slider>
          <Label
            [text]="'Value: ' + controls.effectIntensity.toFixed(2)"
            class="value-label"
          ></Label>
        </StackLayout>

        <!-- Color Saturation -->
        <StackLayout class="control-group mb-4">
          <Label text="Color Saturation" class="control-label"></Label>
          <Slider
            [value]="controls.colorSaturation"
            minValue="0"
            maxValue="2"
            step="0.1"
            (valueChange)="onColorSaturationChange($event)"
            class="slider"
          >
          </Slider>
          <Label
            [text]="'Value: ' + controls.colorSaturation.toFixed(2)"
            class="value-label"
          ></Label>
        </StackLayout>

        <!-- Heat Sensitivity -->
        <StackLayout class="control-group mb-4">
          <Label text="Heat Sensitivity" class="control-label"></Label>
          <Slider
            [value]="controls.heatSensitivity"
            minValue="0.1"
            maxValue="2"
            step="0.05"
            (valueChange)="onHeatSensitivityChange($event)"
            class="slider"
          >
          </Slider>
          <Label
            [text]="'Value: ' + controls.heatSensitivity.toFixed(2)"
            class="value-label"
          ></Label>
        </StackLayout>

        <!-- Heat Decay -->
        <StackLayout class="control-group mb-4">
          <Label text="Heat Decay" class="control-label"></Label>
          <Slider
            [value]="controls.heatDecay"
            minValue="0.9"
            maxValue="0.999"
            step="0.001"
            (valueChange)="onHeatDecayChange($event)"
            class="slider"
          >
          </Slider>
          <Label
            [text]="'Value: ' + controls.heatDecay.toFixed(3)"
            class="value-label"
          ></Label>
        </StackLayout>

        <!-- Interaction Radius -->
        <StackLayout class="control-group mb-4">
          <Label text="Interaction Radius" class="control-label"></Label>
          <Slider
            [value]="controls.interactionRadius"
            minValue="0.5"
            maxValue="3"
            step="0.1"
            (valueChange)="onInteractionRadiusChange($event)"
            class="slider"
          >
          </Slider>
          <Label
            [text]="'Value: ' + controls.interactionRadius.toFixed(2)"
            class="value-label"
          ></Label>
        </StackLayout>

        <!-- Gradient Shift -->
        <StackLayout class="control-group mb-4">
          <Label text="Gradient Shift" class="control-label"></Label>
          <Slider
            [value]="controls.gradientShift"
            minValue="-0.5"
            maxValue="0.5"
            step="0.05"
            (valueChange)="onGradientShiftChange($event)"
            class="slider"
          >
          </Slider>
          <Label
            [text]="'Value: ' + controls.gradientShift.toFixed(2)"
            class="value-label"
          ></Label>
        </StackLayout>

        <!-- Action Buttons -->
        <StackLayout class="mt-4">
          <Button
            text="Reset to Defaults"
            (tap)="resetToDefaults()"
            class="rounded-md capitalize border border-blue-500 text-blue-500 bg-white mb-3 py-3 text-lg"
          ></Button>
          <Button
            text="Save"
            (tap)="onBack()"
            class="rounded-md bg-blue-500 text-white capitalize py-3 text-lg"
          ></Button>
        </StackLayout>
      </StackLayout>
    </ScrollView>
  `,
  styles: [
    `
      .control-group {
        background-color: #222;
        padding: 16;
        border-radius: 8;
        margin-bottom: 8;
      }

      .control-label {
        font-size: 16;
        font-weight: bold;
        color: #efefef;
        margin-bottom: 8;
      }

      .value-label {
        font-size: 14;
        color: #efefef;
        text-align: center;
        margin-top: 4;
      }

      .slider {
        margin: 8 0;
      }

      .btn {
        font-size: 16;
        padding: 12;
        margin: 4;
      }

      .btn-primary {
        background-color: #007bff;
        color: white;
      }

      .btn-outline {
        background-color: transparent;
        color: #007bff;
        border-color: #007bff;
        border-width: 1;
        android-elevation: -4;
      }

      .h1 {
        font-size: 24;
        font-weight: bold;
        color: #333;
      }

      .action-bar {
        background-color: #007bff;
        color: white;
      }
    `,
  ],
  schemas: [NO_ERRORS_SCHEMA],
})
export class ControlsComponent {
  dialogRef = inject(NativeDialogRef);
  controls = {
    effectIntensity: 1.0,
    colorSaturation: 1.3,
    heatSensitivity: 0.5,
    heatDecay: 0.95,
    interactionRadius: 1.0,
    gradientShift: 0.0,
  };

  private defaults = { ...this.controls };

  constructor(private router: Router) {
    this.loadControls();
  }

  onEffectIntensityChange(event: any) {
    this.controls.effectIntensity = event.value;
    this.saveControls();
  }

  onColorSaturationChange(event: any) {
    this.controls.colorSaturation = event.value;
    this.saveControls();
  }

  onHeatSensitivityChange(event: any) {
    this.controls.heatSensitivity = event.value;
    this.saveControls();
  }

  onHeatDecayChange(event: any) {
    this.controls.heatDecay = event.value;
    this.saveControls();
  }

  onInteractionRadiusChange(event: any) {
    this.controls.interactionRadius = event.value;
    this.saveControls();
  }

  onGradientShiftChange(event: any) {
    this.controls.gradientShift = event.value;
    this.saveControls();
  }

  resetToDefaults() {
    this.controls = { ...this.defaults };
    this.saveControls();
  }

  onBack() {
    this.dialogRef.close();
  }

  private saveControls() {
    try {
      ApplicationSettings.setString(
        "thermalControls",
        JSON.stringify(this.controls)
      );
    } catch (error) {
      console.log("Could not save controls:", error);
    }
  }

  private loadControls() {
    try {
      const saved = ApplicationSettings.getString("thermalControls");
      if (saved) {
        this.controls = { ...this.controls, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.log("Could not load controls:", error);
    }
  }

  static getCurrentControls() {
    try {
      const saved = ApplicationSettings.getString("thermalControls");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.log("Could not load controls:", error);
    }

    return {
      effectIntensity: 1.0,
      colorSaturation: 1.3,
      heatSensitivity: 0.5,
      heatDecay: 0.95,
      interactionRadius: 1.0,
      gradientShift: 0.0,
    };
  }
}
