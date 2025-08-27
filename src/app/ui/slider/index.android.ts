import {
  Background,
  AndroidHelper,
  Color,
  colorProperty,
  backgroundColorProperty,
  backgroundInternalProperty,
  Property,
} from "@nativescript/core";
import {
  SliderBase,
  valueProperty,
  minValueProperty,
  maxValueProperty,
} from "@nativescript/core/ui/slider/slider-common";

export * from "@nativescript/core/ui/slider/slider-common";

export const stepProperty = new Property<Slider, number>({
  name: "step",
  defaultValue: 1,
});

interface OwnerSeekBar extends android.widget.SeekBar {
  owner: Slider;
}

let SeekBar: typeof android.widget.SeekBar;
let SeekBarChangeListener: android.widget.SeekBar.OnSeekBarChangeListener;

function initializeListenerClass(): void {
  if (!SeekBarChangeListener) {
    @NativeClass
    @Interfaces([android.widget.SeekBar.OnSeekBarChangeListener])
    class SeekBarChangeListenerImpl
      extends java.lang.Object
      implements android.widget.SeekBar.OnSeekBarChangeListener
    {
      constructor() {
        super();

        return global.__native(this);
      }

      onProgressChanged(
        seekBar: OwnerSeekBar,
        progress: number,
        fromUser: boolean
      ): void {
        const owner = seekBar.owner;
        if (owner && !owner._supressNativeValue) {
          // @ts-ignore
          const scaledValue = owner.minValue + progress * owner.step;
          valueProperty.nativeValueChange(
            owner,
            parseFloat(scaledValue.toFixed(10))
          );
        }
      }

      onStartTrackingTouch(seekBar: OwnerSeekBar): void {
        //
      }

      onStopTrackingTouch(seekBar: OwnerSeekBar): void {
        //
      }
    }

    SeekBarChangeListener = new SeekBarChangeListenerImpl();
  }
}

function getListener(): android.widget.SeekBar.OnSeekBarChangeListener {
  return SeekBarChangeListener;
}

export class Slider extends SliderBase {
  _supressNativeValue: boolean;
  nativeViewProtected: OwnerSeekBar;

  public createNativeView() {
    if (!SeekBar) {
      SeekBar = android.widget.SeekBar;
    }

    return new SeekBar(this._context);
  }

  public initNativeView(): void {
    super.initNativeView();
    const nativeView = this.nativeViewProtected;
    nativeView.owner = this;
    initializeListenerClass();
    const listener = getListener();
    nativeView.setOnSeekBarChangeListener(listener);
  }

  public disposeNativeView() {
    this.nativeViewProtected.owner = null;
    super.disposeNativeView();
  }

  public resetNativeView(): void {
    super.resetNativeView();
    const nativeView = this.nativeViewProtected;
    nativeView.setMax(100);
    nativeView.setProgress(0);
    nativeView.setKeyProgressIncrement(1);
  }

  /**
   * There is no minValue in Android. We simulate this by subtracting the minValue from the native value and maxValue.
   * We need this method to call native setMax and setProgress methods when minValue property is changed,
   * without handling the native value changed callback.
   */
  private setNativeValuesSilently() {
    this._supressNativeValue = true;
    const nativeView = this.nativeViewProtected;
    // @ts-ignore
    const scale = 1 / this.step;
    try {
      nativeView.setMax(Math.round((this.maxValue - this.minValue) * scale));
      nativeView.setProgress(Math.round((this.value - this.minValue) * scale));
      nativeView.setKeyProgressIncrement(1);
    } finally {
      this._supressNativeValue = false;
    }
  }

  [valueProperty.setNative](value: number) {
    this.setNativeValuesSilently();
  }

  [minValueProperty.setNative](value: number) {
    this.setNativeValuesSilently();
  }

  [maxValueProperty.getDefault](): number {
    return 100;
  }
  [maxValueProperty.setNative](value: number) {
    this.setNativeValuesSilently();
  }

  [stepProperty.getDefault](): number {
    return 1;
  }
  [stepProperty.setNative](value: number) {
    this.setNativeValuesSilently();
  }

  [colorProperty.getDefault](): number {
    return -1;
  }
  [colorProperty.setNative](value: number | Color) {
    const drawable = this.nativeViewProtected.getThumb();
    if (value instanceof Color) {
      AndroidHelper.setDrawableColor(value.android, drawable);
    } else {
      AndroidHelper.clearDrawableColor(drawable);
    }
  }

  [backgroundColorProperty.getDefault](): number {
    return -1;
  }
  [backgroundColorProperty.setNative](value: number | Color) {
    const drawable = this.nativeViewProtected.getProgressDrawable();
    if (value instanceof Color) {
      AndroidHelper.setDrawableColor(value.android, drawable);
    } else {
      AndroidHelper.clearDrawableColor(drawable);
    }
  }

  [backgroundInternalProperty.getDefault](): Background {
    return null;
  }
  [backgroundInternalProperty.setNative](value: Background) {
    //
  }
}

stepProperty.register(Slider);