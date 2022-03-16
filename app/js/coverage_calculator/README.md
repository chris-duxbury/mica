Coverage Calculator App
=======================

Overview
--------

This app is written using Node.js module style, but doesn't use any Node library. The reason for this is so that the app can be easily tested. This app doesn't have any UI implemented; this only provide the javascript files. To use this app, include `bitmap.js` and the browserified js file (See Build for more details).

Version
-------

This is a modified version of micasense/coverage-calculator. The modification includes the refactoring of for loop into using `setTimeout` to give time for the progress bar to update.

Build
-----

To build this app, use `browserify` with its `standalone` option on `heatmapGenerator.js`.

### Using command line

```bash
$ browserify heatmapGenerator.js --standalone Heatmap -o coverageApp.js
```

### Using build tools

`gulp` and `grunt` have supports for `browserify`. Check their respective documentation on how to use it

### How to use the app

After running the browserify command (or build task), there should be an output js file (`coverageApp.js`). Include `coverageApp.js` and `bitmap.js` in the html file. In the main javascript file, use the specified standalone variable (`Heatmap`) to access all the functions of coverage calculator app. This variable is attached to `window`.

Implementation Details
----------------------

The `Heatmap` variable gives access to the two functions of this app: `Heatmap.getFlightData` and `Heatmap.getImageCoverage`.

### getFlightData

This function takes `features`, an array of captures represented as JSON objects. It returns an object containing:
- `agl`: the estimated above ground level, calculated from the `median_alt - min_alt`. More meaningful if there is at least one capture taken on the ground
- `horizontalGSD`: meters per pixel of the captured image

### getImageCoverage

This functions take `features`, `agl` of flight, camera `orientation`, `onFinishFunction`, and `additionalArgs` as an object. The additional arguments includes:

- `unit`: the unit pixel (meters per pixel) of the output coverage image. If the unit is not provided, `division` must be provided
- `division` (required without `unit`): how many slices a capture is divided horizontally. If the `unit` is not provided, this will be used to calculate the unit pixel
- `baseColor`(optional): an array of RGB value (0-255) that will be used to color the output coverage image. The index is mapped into how many polygons intersect (i.e. baseColor[5] = the color for a pixel with 5 polygons intersection)
- `updateUnit` (optional): a function that takes unit (float) as an argument. This function can be used to update the UI if the unit pixel is not provided and calculated using `division`
- `updateProgress` (optional): a function that takes percentage (float) as an argument. This function can be used to update the UI to show the rendering progress.

This function will return an img DOM containing the coverage image by passing the DOM into `onFinishFunction`. If the image can't be generated, a null will be passed in along the error message (string) as the second argument.

TODO: add some data-area etc

Extra Notes
-----------

### Progress Display

There are three distinct steps needed to produce the coverage image:
1. Convert features to polygon object
2. Calculating the heatmap / polygon intersections
3. Convert the heatmap into a bitmap

The first step usually very fast.
The second step takes the longest to do; therefore, `updateProgress` will reflect the progress for this step.
The third step (like other steps) depends on the size of features array, but the longest so far takes about 2 seconds. Since `updateProgress` will only reflect the second step, it is better to show a loading message after the progress bar hits 100% to let to wait a couple more seconds.

### Changing the ground model

Currently, this app assumes that the ground is an infinite flat plane with constant altitude. The flatplane is defined in the `flatplane.js`. To change the ground model, implements the required functions mentioned in the `groundModel.js` and replace the line `require('flatplane.js')`.

### Feature object

This app assumes that the captures' information is stored as a feature object. The complete GeoJSON format is described in the Google Doc. But the feature object is assumed to be in this format:

```JSON
{  
    "type" : "Feature",
    "geometry" : {
        "type" : "Point",
        "coordinates" : [47.649, -122.339, 100.0]
    },
    "properties" : {
        "Attitude" : [0.0, 33.0, -30.0],
        "FocalLength" : 5.5,
        "PixelSize" : [0.00375, 0.00375],
        "ImageSize" : [1280, 960]
    }
}
```