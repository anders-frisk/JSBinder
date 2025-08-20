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
- **root**: DOM pointer to the element `binder.scan()` starts from. Default `document.body`.
- **prefix**: Add a prefix to avoid conflicts with other libraries. `prefix: 'xyz'` will change the attributes to `<div data-xyz-bind='...'></div>` etc.
- **interpolation**: Set custom start and end tags to avoid conflicts with other libraries. Default `["{{", "}}"]`.


## State
Update state for JSBinder to work with.

With an object:
```javascript
binder.setState({ title: "JSBinder", decription: "A JS library to make the DOM data-driven." });
```

Or modify current state with a function returning an object:
```javascript
binder.SetState((current) => ({ items : [...current.items, "new item"] }));
```
A call to `.setState()` will let JSBinder know a refresh of the DOM is needed and will be triggered async. Updates can be partial, only members specified will be updated. <!-- In this example `title` keeps its value. -->

# Directives
You can attach one or more directives to any HTML element by adding `data-*` attributes containing [expressions](#Expressions).


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

Text updates can also be made with interpolation syntax `{{...}}`.

```html
<div>{{cart.length}} {{cart.length === 1 ? "item" : "items"}} in cart.</div>
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
  <li data-onclick="tab = 'a'">A</li>
  <li data-onclick="tab = 'b'">B</li>
</ul>
<div data-if="tab === 'a'">Panel A</div>
<div data-if="tab === 'b'">Panel B</div>
```

Result:
```html
<ul>
  <li>A</li>
  <li>B</li>
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
  <li data-for="@index" data-from="0" data-to="planets.length - 1">{{planets[@index].name}}</li>
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


**Where**<br />
Filter list by adding a `data-where="expression"`.

`data-where="planets[@index].type == 'Gas'"` will result in a list containing '**Jupiter**' and '**Saturn**'.

`data-for="@number" data-from="0" data-to="5" data-where="@number % 2 == 0"` will result in '**0**', '**2**' and '**4**'. 


**Events**<br />
For triggers the [event](#Events) `jsbinder-for` with `e.detail.action = "add" / "remove"`.


## Each
`data-each="@variable in source"` iterates any list and adds one element for each item.<br /> Each must be combined with a `data-key="expression"` that evaluates in a unique key.

```html
<ul>
  <li data-each="@planet in planets" data-key="@planet.name">{{@planet.name}}</li>
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


**Where, Skip, Limit, OrderBy & Distinct**<br />
Filter list by adding a `data-where="expression"`.<br />
Limit to a subrange by `data-skip="expression"` and `data-limit="expression"`.<br />
Sort by `data-orderby="expression"`.<br />
Filter for only distinct values by `data-distinct="expression"`.

*Where, skip, limit, orderby and distinct can be used independently or in any combination.*

`data-where="@planet.type == 'Ice'"` will result in a list containing '**Uranus**' and '**Neptune**'.

`data-skip="2" data-limit="3"` will result in a list containing '**Venus**', '**Earth**' and '**Mars**'.

`data-orderby="@planet.diameter"` will result in a sorted list from smallest to largest planet.

`data-distinct="@planet.type` will result in a list of first item of each type.


**Events**<br />
Each triggers the [event](#Events) `jsbinder-each` with `e.detail.action = "add" / "remove"`.


## Attribute
Set attributes with `data-attr="'attribute' : expression"`.<br /> Add more attributes separated by semicolon `data-attr="'attribute1' : expression1; 'attribute2' : expression2"`.

*Select and input value must be set using `data-bind="expression"`.*

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

Attribute updates can also be made with interpolation syntax `{{...}}`.

```html
<img src="{{details.img}}" title="{{details.title}}" />
```


**Custom attribute implementations**

```html
<input data-disabled="data.valid === false" />
```


**Events**<br />
Attribute triggers the [event](#Events) `jsbinder-attr` with `e.detail.key = attribute` and `e.detail.value = value`.


## Class
Add or remove a class with `data-class="'classname' : expression"`.<br /> Define more classes separated by semicolon `data-class="'classname1' : expression1; 'classname2' : expression2"`.<br />If expression evaluates 'truthy' class is added and if evaluated 'falsy' class will be removed.

```javascript
binder.setState({ details: { title: "Earth", type: "Terrestrial" }});
```

```html
<div data-class="'terrestrial_planet' : details.type == 'Terrestrial'">{{details.title}}</div>
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
<div data-style="'color' : details.color">{{details.title}}</div>
```

Result:
```html
<div style='color: #0000FF;'>Earth</div>
```


**Events**<br />
Style triggers the [event](#Events) `jsbinder-style` with `e.detail.key = property` and `e.detail.value = value`.


## Value
ToDo....


# Reversed Directives
The following directives are used to update state in response to user interactions.<br />
For more advanced updates, plain JavaScript events and `binder.setState(...)` is recomended.

## OnClick
Adds functionallity to update state with new data from an onclick event.<br />
`data-onclick="data = 1"` or multiple values `data-onclick="data1 = 1; data2 = 2"`.
```html
<button data-onclick="page = 1">First page</button>
```


## OnChange
Adds functionallity to update state with new data from onchange event.<br />
Variable `@value` will return the value as `string` for input/select and `boolean` for checkbox.<br />
`data-onchange="data = @value"` or multiple values `data-onchange="data1 = @value; data2 = 2"`.
```html
<input type='text' data-onchange="title = @value" />
<select data-onchange="page = @value">...</select>
```


# Templates
`<template data-template="templatename">` is helpful when same element will be added in multiple places. A variable `@data` will be used inside the template. Templates also allows recursive implementations.

`data-render="templatename" data-source="source"` is used to render from a template inside an element. 

See [Recursive tree](#recursive-tree) for an example.

**Events**<br />
Render triggers the [event](#Events) `jsbinder-render`.


# Expressions

Expressions can besides accessing the state handle the following standard JavaScript operations etc.

- Parentheses `(`, `)`
- Comparators `==`, `===`, `!=`, `!==`, `>`, `>=`, `<`, `<=`
- Logic `&&`, `||`, `??`, `!`
- Math `*`, `/`, `+`, `-`, `%`, `**`
- Binary `&`, `|`, `^`, `<<`, `>>`, `>>>`, `~`
- Ternary `...?...:...`
- Strings, numbers, true, false, null, undefined, Infinity, NaN.
- [Functions](#Functions)


# Functions

`binder.addFunction(functionname, (x) => {})` can be added to extend functionallity in the expression evaluator.<br />
Function is used in expressions with `#functionname(...)`.

`binder.addFunction("round", (x) => Math.round(x));` and `<span>{{#round(5.55)}}</span>` reslults in `<span>6</span>`.


# Events
All directives dispatches bubbling events on all updates. Events can be listened with following syntax.

```javascript
document.body.addEventListener("jsbinder-bind", (e) => console.log("Bind event on", e.target, "with details", e.detail));
```


# Examples

## Table with filter
[https://anders-frisk.github.io/jsbinder/demo-table-with-filter.html](https://anders-frisk.github.io/jsbinder/demo-table-with-filter.html)
```javascript
binder.setState({
  planets,
  type_filter : "",
});
```

```html
<select data-bind='type_filter' data-onchange="type_filter = @value">
  <option value="">All</option>
  <option data-each="@x in planets" data-key="@x.type" data-distinct="@x.type" value="{{@x.type}}">{{@x.type}}</option>
</select>
<table>
  <tr>
    <th>Name</th>
    <th>Diameter (km)</th>
    <th>Type</th>
  </tr>
  <tr data-each="@x in planets" data-key="@x.name" data-where="type_filter === '' || @x.type === type_filter">
    <td>{{@x.name}}</td>
    <td>{{@x.diameter}}</td>
    <td>{{@x.type}}</td>
  </tr>
</table>
```


## Table with paging
[https://anders-frisk.github.io/jsbinder/demo-table-with-paging.html](https://anders-frisk.github.io/jsbinder/demo-table-with-paging.html)
```javascript
binder.addFunction("ceil", (x) => Math.ceil(x));
binder.setState({
  planets,
  page: 0,
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
  <tr data-for="@i" data-from="page * pagesize" data-to="page * pagesize + pagesize - 1" data-where="planets[@i] !== undefined">
    <td>{{planets[@i].name}}</td>
    <td>{{planets[@i].diameter}}</td>
    <td>{{planets[@i].type}}</td>
  </tr>
</table>
<button data-for="@page" data-from="1" data-to="#ceil(planets.length / pagesize)" data-onclick="page = @page - 1">{{@page}}</button>
```


## Recursive Tree
[https://anders-frisk.github.io/jsbinder/demo-recursive-tree.html](https://anders-frisk.github.io/jsbinder/demo-recursive-tree.html)<br />
*Example only shows two levels of recursiveness but can handle as many as defined in state.*

```javascript
var treeData = 
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
binder.setState({ treeData });
```

```html
<template data-template="tree">
  <li data-each="@item in @data" data-key="@item.title">
    <span>{{@item.title}}</span>
    <ul data-if="@item.items.length > 0" data-render="tree" data-source="@item.items"></ul>
  </li>
</template>

<ul data-render="tree" data-source="treeData"></ul>
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
