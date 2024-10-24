> [!NOTE]
> This library is still under development no releases yet. Changes and updates will be made.

# JSBinder
**A lightweight JavaScript library to make your DOM data-driven in the most simple way.**

With no dependencies and objective to bring advanced features to any web environment with best possible performance.

# Installation and initializing
Download and include [binder.js](binder.js) in your HTML.

```html
<script src="binder.js"></script>
```

Create a new JSBinder instance and call `.scan()` to find all elements with directives.

```javascript
const binder = new JSBinder();
binder.scan();
```


  
## Options
JSBinder can be initialized with an optional object.

```javascript
const binder = new JSBinder(options);
```

Supported parameters are:
- **root**: DOM pointer to the element `binder.scan()` starts from. Default `document`.
- **prefix**: A prefix can be added to be able to use multiple instances of JSBinder or to avoid confilcts with other libraries. `prefix: 'xyz'` will change the attributes to `<div data-xyz-bind='...'></div>` etc.


## State
Update state for JSBinder to work with.
```javascript
let state = { title: "JSBinder", decription: "A JS library to make the DOM data-driven." };
binder.setState(state);
```
A call to `.setState()` will let JSBinder know a refresh of the DOM is needed and will be triggered async. Updates can be partial, only members specified will be updated. <!-- In this example `title` keeps its value. -->

<!--
```javascript
binder.setState({ decription: "This is an updated description." });
```
-->

# Directives
Any HTML element can be connected to one or more directives by adding dataset attributes with [expressions](#Expressions).


## Bind
`data-bind="expression"` updates the target with data from state. Depending on element type bind affects as follows:
- Input/Select >> value.
- Checkbox >> checked (boolean).
- Img/Iframe >> src.
- div / span / ... >> innerHTML.

```javascript
binder.setState({ title: "JSBinder" });
```

```html
<div data-bind='title'></div>
```

Result:
```html
<div>JSBinder</div>
```

**Events**<br />
Bind triggers the [event](#Events) `jsbinder-bind` with `e.detail.value = value`.<br />


## If
`data-if="expression"` adds or removes an element.

```javascript
binder.setState({ tab: 'a' });
```

```html
<ul>
  <li onclick="binder.setState({tab: 'a'})">A</li>
  <li onclick="binder.setState({tab: 'b'})">B</li>
</ul>
<div data-if="tab === 'a'">Panel A</div>
<div data-if="tab === 'b'">Panel B</div>
```

Result:
```html
<ul>
  <li onclick="binder.setState={tab: 'a'}">A</li>
  <li onclick="binder.setState={tab: 'b'}">B</li>
</ul>
<div>Panel A</div>
<!-- if -->
```

**Events**<br />
If triggers the [event](#Events) `jsbinder-if` with `e.detail.action = "add" / "remove"`.


## For
`data-for="@variable"` adds elements with an incremental variable, limited by `data-from="expression"` and `data-to="expression"` (inclusive).

```javascript
const planets = [
  { "name": "Sun", "diameter": 1391016, "type": "Star" },
  { "name": "Mercury", "diameter": 4879, "type": "Terrestrial" },
  { "name": "Venus", "diameter": 12104, "type": "Terrestrial" },
  { "name": "Earth", "diameter": 12742, "type": "Terrestrial" },
  { "name": "Mars", "diameter": 6779, "type": "Terrestrial" },
  { "name": "Jupiter", "diameter": 139820, "type": "Gas" },
  { "name": "Saturn", "diameter": 116460, "type": "Gas" },
  { "name": "Uranus", "diameter": 50724, "type": "Ice" },
  { "name": "Neptune", "diameter": 49244, "type": "Ice" },
];
binder.setState({ planets });
```

```html
<ul>
  <li data-for="@index" data-from="0" data-to="planets.length - 1" data-bind="planets[@index].name" />
</ul>
```

Result:
```html
<ul>
  <!-- for -->
  <li>Sun</li>
  <li>Mercury</li>
  ...
  <li>Neptune</li>
  <!-- /for -->
</ul>
```


**Where**

Filter list by adding a `data-where="expression"`.

`data-where="planets[@index].type == 'Gas'"` will result in a list containing '**Jupiter**' and '**Saturn**'.

`data-for="@number" data-from="0" data-to="5" data-where="@number % 2 == 0"` will result in '**0**', '**2**' and '**4**'. 


**Events**<br />
For triggers the [event](#Events) `jsbinder-for` with `e.detail.action = "add" / "remove"`.


## Each
`data-each="@variable in source"` iterates any list and adds one element for each item.<br /> Each must be combined with a `data-key="expression"` that evaluates in a unique key.

```html
<ul>
  <li data-each="@planet in planets" data-key="@planet.name" data-bind="@planet.name" />
</ul>
```

Result:
```html
<ul>
  <!-- each -->
  <li>Sun</li>
  <li>Mercury</li>
  ...
  <li>Neptune</li>
  <!-- /each -->
</ul>
```


**Where, Skip & Limit**

Filter list by adding a `data-where="expression"` and/or limit to a subrange by adding `data-skip="expression"` and `data-limit="expression"`. 

*Where, skip and limit can be used independently.*

`data-where="@panelt.type == 'Ice'"` will result in a list containing '**Uranus**' and '**Neptune**'.

`data-skip="2" data-limit="3"` will result in a list containing '**Venus**', '**Earth**' and '**Mars**'.


**Events**<br />
Each triggers the [event](#Events) `jsbinder-each` with `e.detail.action = "add" / "remove"`.


## Attribute
Set attributes with `data-attr="'attribute' : expression"`.<br /> Add more attributes separated by semicolon `data-attr="'attribute1' : expression1; 'attribute2' : expression2"`.

```javascript
binder.setState({ details: { img: "earth.jpeg", title: "Earth" }});
```

```html
<img data-bind="details.img" data-attr="'title' : details.title" />
```

Result:
```html
<img src='earth.jpeg' title='Earth' />
```

**Events**<br />
Attribute triggers the [event](#Events) `jsbinder-attr` with `e.detail.key = attribute` and `e.detail.value = value`.


## Class
Add or remove a class with `data-class="'classname' : expression"`.<br /> Define more classes separated by semicolon `data-class="'classname1' : expression1; 'classname2' : expression2"`.<br />If expression evaluates 'trueish' class is added and if evaluated 'falsish' class will be removed.

```javascript
binder.setState({ details: { title: "Earth", type: "Terrestrial" }});
```

```html
<div data-bind="details.title" data-class="'terrestrial_planet' : details.type == 'Terrestrial'"></div>
```

Result:
```html
<div class='terrestrial_planet'>Earth</div>
```


**Events**<br />
Class triggers the [event](#Events) `jsbinder-class` with `e.detail.key = classname` and `e.detail.action = "add" / "remove"`.


## Style
Set style properties with `data-style="'property' : expression"`.<br /> Add more styles separated by semicolon `data-style="'left' : data.x; 'top' : data.y"`.

```javascript
binder.setState({ details: { title: "Earth", color: "#0000FF" }});
```

```html
<div data-bind="details.title" data-style="'color' : details.color"></div>
```

Result:
```html
<div style='color: #0000FF;'>Earth</div>
```


**Events**<br />
Style triggers the [event](#Events) `jsbinder-style` with `e.detail.key = property` and `e.detail.value = value`.


# Templates
`<template data-template="templatename">` is helpful when same element will be added in multiple places. A variable `@data` will be used inside the template. Templates also allows recursive implementations.

`data-render="templatename" data-source="source"` is used to render from a template inside an element. 

See [Recursive tree](#recursive-tree) for an example.

**Events**<br />
Render triggers the [event](#Events) `jsbinder-render` with `e.detail.source = source`.


# Expressions

Expressions can besides accessing the state handle the following standard JavaScript operations etc.

- Parentheses `(`, `)`
- Comparators `==`, `===`, `!=`, `!==`, `>`, `>=`, `<`, `<=`
- Logic `&&`, `||`, `??`, `!`
- Math `*`, `/`, `+`, `-`, `%`, `**`
- Binary `&`, `|`, `^`, `<<`, `>>`, `>>>`, `~`
- Ternary `...?...:...`
- Strings, numbers, booleans, null, undefined...
- [Functions](#Functions)


# Functions

`binder.addFunction(functionname, (x) => {})` can be added to extend functionallity in the expression evaluator.<br />
Function is used in expression with `#functionname(...)`.

`binder.addFunction("round", (x) => Math.round(x));` and `<span data-bind="#round(5.55)"></span>` reslults in `<span>6</span>`.


# Events
All directives dispatches bubbling events on all updates. Events can be listened with following syntax.

```javascript
document.body.addEventListener("jsbinder-bind", (e) => console.log("Bind event on", e.target, "with details", e.detail));
```


# Advanced examples

## Table with filter
[demo](demo-table-with-filter.html)
```javascript
binder.setState({
  planets,
  type_filter : "",
  type_filters : [...new Set(planets.map((x) => x.type))], //Creates a list of distinct types.
});
```

```html
<select data-bind='type_filter' onchange="binder.setState({type_filter: this.value})">
  <option value="">All</option>
  <option data-each="@x in type_filters" data-key="@x" data-bind="@x" data-attr="'value' : @x"></option>
</select>
<table>
  <tr>
    <th>Name</th>
    <th>Diameter (km)</th>
    <th>Type</th>
  </tr>
  <tr data-each="@x in planets" data-key="@x.name" data-where="type_filter === '' || @x.type === type_filter">
    <td data-bind="@x.name"></td>
    <td data-bind="@x.diameter"></td>
    <td data-bind="@x.type"></td>
  </tr>
</table>
```


## Table with paging
[demo](demo-table-with-paging.html)
```javascript
binder.addFunction("ceil", (x) => Math.ceil(x));
binder.setState({
  planets,
  page : 0,
  pagesize: 4,
});
```

```html
<table>
  <tr>
    <th>Name</th>
    <th>Diameter (km)</th>
    <th>Type</th>
  </tr>
  <tr data-for="@i" data-from="page * pagesize" data-to="page * pagesize + pagesize">
    <td data-bind="planets[@i].name"></td>
    <td data-bind="planets[@i].diameter"></td>
    <td data-bind="planets[@i].type"></td>
  </tr>
</table>
<button data-for="@page" data-from="1" data-to="#ceil(planets.length / pagesize)" data-bind="@page" onclick="binder.setState({page: parseInt(this.innerText) - 1})"></button>
```


## Recursive Tree
[demo](demo-recursive-tree.html)<br />
*Example only shows two levels of recursiveness but can handle as many as defined in state.*

```javascript
var tree = 
[
  {
    title: "Terrestrial planets",
    items:
    [
      { title: "Mercury", items: [] },
      { title: "Venus", items: [] },
      ...
    ]
  },
  {
    title: "Gas planets",
    items:
    [
      { title: "Jupiter", items: [] },
      { title: "Saturn", items: [] },
    ]
  },
  ...
];
binder.setState({ tree });
```

```html
<template data-template="tree">
  <li data-each="@item in @data" data-key="@item.title">
    <span data-bind="@item.title"></span>
    <ul data-if="@item.items.length > 0" data-render="tree" data-source="@item.items"></ul>
  </li>
</template>

<ul data-render="tree" data-source="tree"></ul>
```

Reslut:
```html
<ul>
  <li>
    <span>Terrestrial planets</span>
    <ul>
      <li><span>Mercury</span></li>
      <li><span>Venus</span></li>
      ...
    </ul>
  </li>
  <li>
    <span>Gas planets</span>
    <ul>
      <li><span>Jupiter</span></li>
      <li><span>Saturn</span></li>
    </ul>
  </li>
  ...
</ul>
```
