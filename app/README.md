Camera App Redesign
===================

Overview
--------

To make integration with the current AngularJS app easy, we structured the HTML in one layout file (`source.html`) and four partials (`partials/*.html`). Each partial is meant to be rendered into the `<main class="Flex">` element of the layout.


Implementation Details
----------------------

### JavaScript

- The only JavaScript behavior implemented was for expanding and collapsing the preference panes in the config page. The code is simply included as an inline `<script/>` tag in `partials/config.html`. Feel free to integrate this with existing JavaScript behaviors, or rewrite it – the script tag and the jQuery dependency are not meant to remain in production.


Build
-----

Note that the generated `index.html` will only include the partial currently referenced in `source.html`, and that the navigation doesn't work out of the box. You will need to integrate the partials into your Angular app.

Note: To build in production mode, add `--production` flag to any command (i.e. `gulp build --production`). The difference between the production mode and the normal (debug) mode is the inclusion of the source maps, meaning both mode do concatenating, minifying, and uglifying. The reason for this behavior is because there is a bug on `gulp-useref`. I have written an issue to the developer [here](https://github.com/jonkemp/gulp-useref/issues/126).

### To build the HTML templates and SCSS:

```bash
$ gulp build
```

### To build, start a dev server, and watch for file changes:

```bash
$ gulp
```

### To open index.html served by the dev server in your default browser:

```bash
$ gulp open-browser
```

### Organization

```
.
├── README.md
├── .tmp/                       # Temporiry folder for compiled CSS
├── dist/                       # **Built** full webpage
├── fonts/                      # Source font files, referenced from style sheet
├── icons/                      # Source image files, referenced from style sheet
├── js/                         # Source for JS files
│   ├── coverage_calculator     # Source for coverage calculator app
│   ├── ...
│   ├── coverageApp.js          # Compiled module for coverage calculator app
├── partials/                   # HTML page templates
│   ├── camera.html
│   ├── config.html
│   ├── home.html
│   └── map.html
├── scss/                       # Source SCSS
│   ├── base/
│   ├── layout/
│   ├── modules/
└── source.html                 # HTML layout template
```


SCSS Organization
-----------------

The following is a deep-dive into the organization of stylesheets, and of the CSS class naming patterns followed in this app. It is recommended that this structure is maintained to ease onboarding in the future.

### Base

  * `/base` styles are the foundation of the site, which include:
    * `_base` - styles are applied directly to element using an element selector
    * `_utilities` - not reflective of application state
    * `_variables` - site-wide variables such as fonts, colors, widths, etc.
    * `_content` - universal text and content styles reside here

### Layout

  * `/layout` determine how sections of the page are structured.

### Modules

  * `/modules` contain discrete components of the page, such as navigation, alert dialogs, buttons, etc. Any new feature or component will be added to this section.

### States

  * `/states` augment and override all other styles, such as whether an element is expanded or collapsed, or if the element is in an error or active state.

#### Distinguishing states and modifiers

A state should be prefixed with `.is-` and reflects a state on the component itself (`.is-active`, `.is-expanded`).

A modifier should be prefixed with `.has-` and generally reflects a state on the child of a component usually the existence of a modifier is kind of circumstantial. The child element has its own state that for styling purposes requires additional styles on the parent. E.g. `.has-expanded-sidebar`

## SUIT-flavored BEM

BEM, meaning _block, element, modifier_, provides meaningful and easy to parse naming conventions that make your CSS easy to understand. It helps you write more maintainable CSS to think in those terms as well.

[SUIT-flavored BEM](http://nicolasgallagher.com/about-html-semantics-front-end-architecture/) is just a slightly nicer looking version of BEM, as used by Nicolas Gallagher's (creator of Normalize.css) [SUIT framework](https://github.com/suitcss/suit). It looks like this:

```scss
/* Component */
.ComponentName {}

/* Component modifier */
.ComponentName--modifierName {}

/* Component descendant */
.ComponentName-descendant {}

/* Component descendant modifier */
.ComponentName-descendant--modifierName {}

/* Component state (scoped to component) */
.ComponentName.is-stateOfComponent {}
```

Note the camelCasing! It looks crazy at first, but it's really pretty pleasant. (It also maps really well to Components/Views).

The resulting HTML would look like this:

```html
<div class="ComponentName">
  <p class="ComponentName-descendant">…</p>
</div>

<div class="ComponentName ComponentName--modifierName">
  <p class="ComponentName-descendant ComponentName-descendant--modifierName">…</p>
</div>
```
