<div align="center">

# JSBinder

**A lightweight, reactive data binding library for vanilla JavaScript**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)]()
[![Browser Support](https://img.shields.io/badge/browser-modern-brightgreen.svg)]()
[![Size](https://img.shields.io/badge/size-~15KB-green.svg)]()

*Build reactive, data-driven web applications with declarative HTML and zero dependencies*

</div>

---

## Table of Contents

- [Overview](#overview)
- [Directives](#directives)
  - [data-bind - Binding state to elements](#data-bind)
  - [data-if - Conditional rendering](#data-if)
  - [data-for - Range-based iteration](#data-for)
  - [data-each - List iteration with filtering and sorting](#data-each)
  - [data-attr - Dynamic attributes](#data-attr)
  - [data-class - Conditional CSS classes](#data-class)
  - [data-style - Dynamic inline styles](#data-style)
  - [data-onclick - Click event handlers](#data-onclick)
  - [data-onchange - Change event handlers](#data-onchange)
  - [data-template / data-render - Template definitions and rendering](#data-template-and-data-render)
- [State Management](#state-management)
- [Expressions](#expressions)
- [Custom functions](#custom-functions)
- [Options](#options)
- [Events](#events)
- [Examples](#examples)
  - [Table with Filter](#table-with-filter)
  - [Table with Paging](#table-with-paging)
  - [Recursive Tree](#recursive-tree)
- [Browser Support](#browser-support)
- [License](#license)

---

## Overview

JSBinder is a lightweight, zero-dependency JavaScript library that brings reactive data binding to vanilla JavaScript applications. With an intuitive declarative syntax using HTML data attributes, JSBinder makes it simple to build dynamic, interactive web applications without the complexity of larger frameworks.

JSBinder bridges the gap between vanilla JavaScript and full-featured frameworks. It provides reactive capabilities without build steps, complex tooling, or steep learning curves.

**Key Features:**

- **Zero Dependencies** - Pure vanilla JavaScript with no external dependencies
- **Lightweight** - Approximately 15KB minified, perfect for performance-conscious applications
- **Declarative Syntax** - Use familiar HTML data attributes for all bindings
- **Reactive State** - Automatic UI updates when state changes
- **Rich Directive Set** - Comprehensive collection of directives for common UI patterns
- **Event System** - Built-in event system for fine-grained control
- **Template Support** - Reusable templates with recursive rendering capabilities
- **Expression Engine** - Powerful expression evaluator supporting JavaScript operators
- **Two-Way Binding** - Seamless synchronization between UI and state
- **Production Ready** - Battle-tested and used in production environments worldwide

### Quick Start

Create your first reactive application in a few simple steps:

```html
<!DOCTYPE html>
<html>
<head>
  <title>JSBinder Quick Start</title>
  <!-- 1. Include JSBinder library -->
  <script src="binder.js"></script>
</head>
<body>
  <div>
    <!-- 2. Prepare the HTML with bindings -->
    <p>Count: {{count}}</p>
    <button data-onclick="count = count + 1">Increment</button>
  </div>
  <script>
    // 3. Create a JSBinder instance
    const binder = new JSBinder();
    
    // 4. Initialize state
    binder.setState({ count: 0 });
    
    // 5. Scan for directives
    binder.scan();
  </script>
</body>
</html>
```

**That's it.** No build tools, no virtual DOM, no complex setup—just reactive HTML with vanilla JavaScript.

---

## Directives

Directives are HTML attributes that binds DOM elements to your application state. They provide declarative control over rendering, styling, and behavior.

---

### data-bind

Creates a binding between state and DOM elements. The behavior depends on the element type.

**Element Behavior:**

| Element Type | Binding Target | Value Type |
|--------------|----------------|------------|
| `<input>`, `<select>`, `<textarea>` | `value` property | String |
| `<input type="checkbox">` | `checked` property | Boolean |
| `<img>`, `<iframe>` | `src` attribute | String |
| Other elements | `innerHTML` | Any (converted to string) |

**Examples:**

```javascript
binder.setState({ 
  title: "Welcome",
  imageUrl: "logo.png",
  isActive: true
});
```

```html
<!-- Text content -->
<div data-bind="title"></div>
<!-- Result: <div>Welcome</div> -->

<!-- Image source -->
<img data-bind="imageUrl" alt="Logo">
<!-- Result: <img src="logo.png" alt="Logo"> -->

<!-- Checkbox -->
<input type="checkbox" data-bind="isActive">
<!-- Result: checked if isActive is true -->

<!-- Input value -->
<input type="text" data-bind="title">
<!-- Result: input shows "Welcome" -->
```

**Interpolation Alternative:**

```html
<div>{{title}}</div>
<img src="{{imageUrl}}" alt="{{title}}">
<p>Cart: {{cart.length}} {{cart.length === 1 ? 'item' : 'items'}}</p>
```

**Events:** Triggers `jsbinder-bind` event with `e.detail.value`

---

### data-if

Conditionally renders an element based on an expression. When the expression is falsy, the element is replaced with a comment placeholder.

**Examples:**

```javascript
binder.setState({ 
  isLoggedIn: true,
  userRole: 'admin',
  itemCount: 5
});
```

```html
<!-- Simple condition -->
<div data-if="isLoggedIn">
  Welcome back!
</div>

<!-- Complex condition -->
<button data-if="isLoggedIn && userRole === 'admin'">
  Admin Panel
</button>

<!-- With expressions -->
<div data-if="itemCount > 0">
  You have {{itemCount}} items
</div>
<div data-if="itemCount === 0">
  Your cart is empty
</div>

<!-- Nested conditions -->
<div data-if="isLoggedIn">
  <div data-if="userRole === 'admin'">Admin Content</div>
  <div data-if="userRole === 'user'">User Content</div>
</div>
```

**Tab Example:**

```javascript
binder.setState({ activeTab: 'profile' });
```

```html
<ul>
  <li data-onclick="activeTab = 'profile'">Profile</li>
  <li data-onclick="activeTab = 'settings'">Settings</li>
  <li data-onclick="activeTab = 'billing'">Billing</li>
</ul>

<div data-if="activeTab === 'profile'">Profile Content</div>
<div data-if="activeTab === 'settings'">Settings Content</div>
<div data-if="activeTab === 'billing'">Billing Content</div>
```

**Events:** Triggers `jsbinder-if` event with `e.detail.action = "add" | "remove"`

**Notes:**
- Elements are completely removed from DOM when condition is false
- Use for expensive content that shouldn't render
- For visibility toggling, use `data-class` with CSS instead

---

### data-for

Generates multiple elements by iterating over a numeric range.

**Required Attributes:**
- `data-for="@variable"` - Iterator variable name
- `data-from="expression"` - Start value (inclusive)
- `data-to="expression"` - End value (inclusive)

**Optional Attributes:**
- `data-where="expression"` - Filter condition

**Examples:**

```javascript
binder.setState({
  planets: [
    { name: "Mercury", diameter: 4879 },
    { name: "Venus", diameter: 12104 },
    { name: "Earth", diameter: 12742 },
    { name: "Mars", diameter: 6779 }
  ]
});
```

```html
<!-- Simple range -->
<div data-for="@i" data-from="1" data-to="5">
  Item {{@i}}
</div>
<!-- Result: Item 1, Item 2, Item 3, Item 4, Item 5 -->

<!-- Array iteration by index -->
<ul>
  <li data-for="@i" data-from="0" data-to="planets.length - 1">
    {{planets[@i].name}} ({{planets[@i].diameter}} km)
  </li>
</ul>

<!-- With filtering -->
<div data-for="@num" data-from="1" data-to="10" data-where="@num % 2 === 0">
  {{@num}}
</div>
<!-- Result: 2, 4, 6, 8, 10 -->
```

**Pagination Example:**

```javascript
binder.setState({
  items: [...],
  page: 0,
  pageSize: 10
});
```

```html
<div data-for="@i" 
     data-from="page * pageSize" 
     data-to="page * pageSize + pageSize - 1"
     data-where="items[@i] !== undefined">
  {{items[@i].title}}
</div>
```

**Events:** Triggers `jsbinder-for` event with `e.detail.action = "add" | "remove"`

---

### data-each

Iterates over arrays with advanced filtering, sorting, and transformation capabilities.

**Required Attributes:**
- `data-each="@variable in source"` - Iteration specification
- `data-key="expression"` - Unique key for each item (for efficient updates)

**Optional Attributes:**
- `data-where="expression"` - Filter condition
- `data-skip="expression"` - Number of items to skip
- `data-limit="expression"` - Maximum number of items
- `data-orderby="expression"` - Sort by expression
- `data-distinct="expression"` - Get unique values by expression

**Examples:**

```javascript
const planets = [
  { name: "Sun", diameter: 1391016, type: "Star" },
  { name: "Mercury", diameter: 4879, type: "Terrestrial" },
  { name: "Venus", diameter: 12104, type: "Terrestrial" },
  { name: "Earth", diameter: 12742, type: "Terrestrial" },
  { name: "Mars", diameter: 6779, type: "Terrestrial" },
  { name: "Jupiter", diameter: 139820, type: "Gas" },
  { name: "Saturn", diameter: 116460, type: "Gas" },
  { name: "Uranus", diameter: 50724, type: "Ice" },
  { name: "Neptune", diameter: 49244, type: "Ice" }
];

binder.setState({ planets });
```

```html
<!-- Basic iteration -->
<ul>
  <li data-each="@planet in planets" data-key="@planet.name">
    {{@planet.name}}
  </li>
</ul>

<!-- With filtering -->
<ul>
  <li data-each="@planet in planets" 
      data-key="@planet.name"
      data-where="@planet.type === 'Gas'">
    {{@planet.name}} (Gas Giant)
  </li>
</ul>
<!-- Result: Jupiter, Saturn -->

<!-- With sorting -->
<ul>
  <li data-each="@planet in planets" 
      data-key="@planet.name"
      data-orderby="@planet.diameter">
    {{@planet.name}} - {{@planet.diameter}} km
  </li>
</ul>
<!-- Result: sorted from smallest to largest -->

<!-- With pagination -->
<ul>
  <li data-each="@planet in planets" 
      data-key="@planet.name"
      data-skip="2"
      data-limit="3">
    {{@planet.name}}
  </li>
</ul>
<!-- Result: 3rd, 4th, and 5th planets -->

<!-- Distinct values -->
<select>
  <option data-each="@planet in planets"
          data-key="@planet.type"
          data-distinct="@planet.type"
          value="{{@planet.type}}">
    {{@planet.type}}
  </option>
</select>
<!-- Result: Star, Terrestrial, Gas, Ice -->

<!-- Complex filtering -->
<div data-each="@planet in planets"
     data-key="@planet.name"
     data-where="@planet.type !== 'Star' && @planet.diameter > 10000"
     data-orderby="@planet.diameter">
  {{@planet.name}}
</div>
```

**Events:** Triggers `jsbinder-each` event with `e.detail.action = "add" | "remove"`

**Notes:**
- `data-key` is required and enables efficient DOM updates
- Multiple modifiers can be combined in any order
- Evaluation order: where → distinct → orderby → skip → limit

---

### data-attr

Dynamically sets HTML attributes based on expressions.

**Syntax:** `data-attr="'attribute' : expression; 'attribute2' : expression2"`

**Examples:**

```javascript
binder.setState({
  imageUrl: "photo.jpg",
  imageTitle: "Sunset",
  linkUrl: "https://example.com",
  isDisabled: false,
  tabIndex: 1
});
```

```html
<!-- Single attribute -->
<img data-bind="imageUrl" data-attr="'title' : imageTitle">
<!-- Result: <img src="photo.jpg" title="Sunset"> -->

<!-- Multiple attributes -->
<a data-attr="'href' : linkUrl; 'target' : '_blank'; 'rel' : 'noopener'">
  Click here
</a>

<!-- Conditional attributes -->
<button data-attr="'disabled' : isDisabled; 'tabindex' : tabIndex">
  Submit
</button>

<!-- Interpolation alternative -->
<img src="{{imageUrl}}" title="{{imageTitle}}">
<a href="{{linkUrl}}" target="_blank">Link</a>
```

**Custom Shorthand Attributes:**

JSBinder also supports direct attribute directives:

```html
<input data-disabled="!isValid">
```

**Events:** Triggers `jsbinder-attr` event with `e.detail.key` and `e.detail.value`

**Notes:**
- For `value` on inputs/selects, use `data-bind` instead
- Attributes are removed if expression evaluates to `null` or `undefined`

---

### data-class

Conditionally adds or removes CSS classes based on expressions.

**Syntax:** `data-class="'className' : expression; 'className2' : expression2"`

**Examples:**

```javascript
binder.setState({
  isActive: true,
  hasError: false,
  userRole: 'admin',
  score: 85
});
```

```html
<!-- Single class -->
<div data-class="'active' : isActive">Item</div>
<!-- Result: <div class="active">Item</div> -->

<!-- Multiple classes -->
<div data-class="'active' : isActive; 'error' : hasError; 'admin' : userRole === 'admin'">
  Content
</div>

<!-- With expressions -->
<div data-class="'passing' : score >= 60; 'excellent' : score >= 90">
  Score: {{score}}
</div>

<!-- Existing classes preserved -->
<div class="card" data-class="'highlighted' : isActive">
  Card Content
</div>
<!-- Result: <div class="card highlighted">Card Content</div> -->
```

**Practical Examples:**

```html
<!-- Navigation active state -->
<nav>
  <a data-class="'active' : currentPage === 'home'" 
     data-onclick="currentPage = 'home'">Home</a>
  <a data-class="'active' : currentPage === 'about'" 
     data-onclick="currentPage = 'about'">About</a>
</nav>

<!-- Form validation -->
<input type="email" 
       data-bind="email"
       data-class="'invalid' : email !== '' && !#isValidEmail(email)">

<!-- Loading states -->
<button data-class="'loading' : isSubmitting; 'disabled' : isSubmitting">
  {{isSubmitting ? 'Submitting...' : 'Submit'}}
</button>
```

**Events:** Triggers `jsbinder-class` event with `e.detail.key` and `e.detail.action`

---

### data-style

Dynamically applies inline CSS styles based on expressions.

**Syntax:** `data-style="'property' : expression; 'property2' : expression2"`

**Examples:**

```javascript
binder.setState({
  textColor: '#ff0000',
  backgroundColor: '#f0f0f0',
  size: 250,
  isVisible: true,
  position: { x: 100, y: 50 }
});
```

```html
<!-- Color styling -->
<div data-style="'color' : textColor; 'backgroundColor' : backgroundColor">
  Styled Text
</div>
<!-- Result: <div style="color: #ff0000; background-color: #f0f0f0;">Styled Text</div> -->

<!-- Dimensions -->
<div data-style="'width' : size + 'px'; 'height' : size + 'px'">
  Square
</div>

<!-- Positioning -->
<div data-style="'left' : position.x + 'px'; 'top' : position.y + 'px'; 'position' : 'absolute'">
  Positioned Element
</div>

<!-- Conditional styles -->
<div data-style="'opacity' : isVisible ? 1 : 0; 'pointerEvents' : isVisible ? 'auto' : 'none'">
  Content
</div>
```

**Practical Examples:**

```html
<!-- Progress bar -->
<div class="progress-bar" 
     data-style="'width' : progress + '%'"></div>

<!-- Dynamic theming -->
<div data-style="'--my-color' : my_color;">
  <span style="color: var(--my-color)">Themed Content</span> <!-- standard style tag used to read var(...) -->
</div>

<!-- Animation properties -->
<div data-style="'transform' : 'translateX(' + offset + 'px)'; 'transition' : 'transform 0.3s'">
  Animated Element
</div>
```

**Events:** Triggers `jsbinder-style` event with `e.detail.key` and `e.detail.value`

**Notes:**
- Use camelCase for CSS properties (`backgroundColor`, not `background-color`)
- Include units (px, %, em, etc.) in expression when needed
- For visibility toggling, `data-class` with CSS is often more performant

---

### data-onclick

Handles click events and updates state directly from HTML.

**Syntax:** `data-onclick="stateProperty = expression; property2 = expression2"`

**Examples:**

```javascript
binder.setState({ 
  count: 0,
  isOpen: false,
  selectedId: null
});
```

```html
<!-- Simple increment -->
<button data-onclick="count = count + 1">
  Increment
</button>

<!-- Toggle boolean -->
<button data-onclick="isOpen = !isOpen">
  {{isOpen ? 'Close' : 'Open'}} Menu
</button>

<!-- Set specific value -->
<button data-onclick="selectedId = 123">
  Select Item
</button>

<!-- Multiple updates -->
<button data-onclick="count = 0; isOpen = false; selectedId = null">
  Reset All
</button>

<!-- With expressions -->
<button data-onclick="count = count < 10 ? count + 1 : 0">
  Increment (Max 10)
</button>
```

**Practical Examples:**

```html
<!-- Pagination -->
<button data-onclick="page = page - 1" 
        data-disabled="page === 0">Previous</button>
<button data-onclick="page = page + 1" 
        data-disabled="page >= totalPages - 1">Next</button>

<!-- Tab navigation -->
<button data-onclick="activeTab = 'overview'" 
        data-class="'active' : activeTab === 'overview'">Overview</button>

<!-- Todo list -->
<button data-onclick="todos = [...todos, {id: Date.now(), text: newTodo, done: false}]; newTodo = ''">
  Add Todo
</button>

<!-- Modal control -->
<button data-onclick="modalOpen = true; modalContent = 'Welcome!'">
  Show Modal
</button>
<div data-if="modalOpen">
  <p>{{modalContent}}</p>
  <button data-onclick="modalOpen = false">Close</button>
</div>
```

**Notes:**
- For complex logic, use standard JavaScript event listeners with `setState()`
- Multiple statements are separated by semicolons
- Expressions are evaluated in the context of current state

---

### data-onchange

Handles input change events with the special `@value` variable.

**Syntax:** `data-onchange="stateProperty = @value; property2 = expression"`

**Value Types:**
- `<input type="text|number|email|...">` → String
- `<input type="checkbox">` → Boolean
- `<select>` → String
- `<textarea>` → String

**Examples:**

```javascript
binder.setState({
  username: '',
  email: '',
  acceptTerms: false,
  country: 'US',
  bio: ''
});
```

```html
<!-- Text input -->
<input type="text" 
       data-bind="username"
       data-onchange="username = @value">

<!-- Email input with validation flag -->
<input type="email" 
       data-bind="email"
       data-onchange="email = @value; emailValid = @value.includes('@')">

<!-- Checkbox -->
<input type="checkbox" 
       data-bind="acceptTerms"
       data-onchange="acceptTerms = @value">

<!-- Select dropdown -->
<select data-bind="country" data-onchange="country = @value">
  <option value="US">United States</option>
  <option value="UK">United Kingdom</option>
  <option value="CA">Canada</option>
</select>

<!-- Textarea -->
<textarea data-bind="bio" data-onchange="bio = @value"></textarea>
```

**Practical Examples:**

```html
<!-- Search filter -->
<input type="text" 
       placeholder="Search..." 
       data-onchange="searchQuery = @value; currentPage = 0">

<div data-each="@item in items"
     data-key="@item.id"
     data-where="@item.name.includes(searchQuery)">
  {{@item.name}}
</div>

<!-- Real-time character count -->
<textarea data-bind="message" 
          data-onchange="message = @value"></textarea>
<p>{{message.length}} / 280 characters</p>

<!-- Dependent dropdowns -->
<select data-bind="category" data-onchange="category = @value; subcategory = ''">
  <option value="electronics">Electronics</option>
  <option value="clothing">Clothing</option>
</select>

<select data-bind="subcategory" 
        data-onchange="subcategory = @value"
        data-if="category !== ''">
  <option data-each="@sub in categories[category].subs"
          data-key="@sub.id"
          value="{{@sub.id}}">{{@sub.name}}</option>
</select>
```

**Notes:**
- For advanced form handling, consider using standard event listeners
- `@value` is a special variable available only in `data-onchange`
- Combines well with `data-bind` for two-way binding

---

### data-template and data-render`

Define reusable templates with recursive rendering capabilities.

**Template Definition:**
```html
<template data-template="templateName">
  <!-- Template content with @data variable -->
</template>
```

**Template Usage:**
```html
<div data-render="templateName" data-source="stateProperty"></div>
```

**Examples:**

**Simple Template:**

```javascript
binder.setState({
  user: {
    name: "John Doe",
    email: "john@example.com"
  }
});
```

```html
<template data-template="userCard">
  <div class="card">
    <h3>{{@data.name}}</h3>
    <p>{{@data.email}}</p>
  </div>
</template>

<div data-render="userCard" data-source="user"></div>
```

**Recursive Tree:**

```javascript
const treeData = [
  {
    title: "Terrestrial Planets",
    items: [
      { title: "Mercury", items: [] },
      { title: "Venus", items: [] },
      { title: "Earth", items: [
        { title: "Moon", items: [] }
      ]},
      { title: "Mars", items: [] }
    ]
  },
  {
    title: "Gas Giants",
    items: [
      { title: "Jupiter", items: [] },
      { title: "Saturn", items: [] }
    ]
  }
];

binder.setState({ treeData });
```

```html
<template data-template="tree">
  <li data-each="@item in @data" data-key="@item.title">
    <span>{{@item.title}}</span>
    <ul data-if="@item.items.length > 0" 
        data-render="tree" 
        data-source="@item.items"></ul>
  </li>
</template>

<ul data-render="tree" data-source="treeData"></ul>
```

**Result:**
```html
<ul>
  <li>
    <span>Terrestrial Planets</span>
    <ul>
      <li><span>Mercury</span></li>
      <li><span>Venus</span></li>
      <li>
        <span>Earth</span>
        <ul>
          <li><span>Moon</span></li>
        </ul>
      </li>
      <li><span>Mars</span></li>
    </ul>
  </li>
  <li>
    <span>Gas Giants</span>
    <ul>
      <li><span>Jupiter</span></li>
      <li><span>Saturn</span></li>
    </ul>
  </li>
</ul>
```

**Events:** Triggers `jsbinder-render` event

**Notes:**
- `@data` is a special variable representing the source data
- Templates can be nested and recursive
- Templates are defined once and can be rendered multiple times
- Template scanning happens before rendering

---

### State Management

#### `setState(data)`

Updates the application state and triggers a reactive refresh of all bindings.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `data` | Object \| Function | Yes | State updates or function returning updates |

**Function Signature:** `(currentState) => updates`

**Returns:** void

**Examples:**

```javascript
// Object update
binder.setState({ 
  username: 'john_doe',
  isLoggedIn: true 
});

// Functional update
binder.setState((current) => ({ 
  count: current.count + 1 
}));

// Array manipulation
binder.setState((current) => ({
  todos: [...current.todos, { id: Date.now(), text: 'New task' }]
}));

// Remove property
binder.setState({ temporaryFlag: undefined });
```

**Notes:**
- State updates are shallow-merged
- Setting a property to `undefined` removes it from state
- Updates are batched and processed in microtasks for performance
- Triggers `jsbinder-stateupdated` event on root element

---

#### `getState()`

Returns a deep clone of the current state object.

**Returns:** Object (deep copy of state)

**Notes:**
- Returns a copy - modifications do not affect actual state
- Use `setState()` to make state changes
- Useful for debugging and logging

---

## Expressions

Expressions are JavaScript-like statements evaluated within directives and interpolations. They have access to the current state and support most JavaScript operators.

**Supported Operations:**

- **Arithmetic:** `+`, `-`, `*`, `/`, `%`, `**`
- **Comparison:** `==`, `===`, `!=`, `!==`, `>`, `>=`, `<`, `<=`
- **Logical:** `&&`, `||`, `??`, `!`, `!!`
- **Bitwise:** `&`, `|`, `^`, `~`, `<<`, `>>`, `>>>`
- **Ternary:** `condition ? true : false`
- **Parentheses:** `(expression)`
- **Literals:** strings, numbers, booleans, null, undefined
- **Custom Functions:** `#functionName(arg)`

---

## Custom Functions

Extend expression capabilities with custom functions.

#### `addFunction(name, method)`

Registers a custom function for use in data binding expressions.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `name` | String | Yes | Function name (valid JavaScript identifier) |
| `method` | Function | Yes | Function with exactly one parameter |

**Returns:** void

**Usage in Expressions:** `#functionName(expression)`

**Examples:**

```javascript
// Mathematical functions
binder.addFunction('round', (x) => Math.round(x));
binder.addFunction('ceil', (x) => Math.ceil(x));
binder.addFunction('floor', (x) => Math.floor(x));
binder.addFunction('abs', (x) => Math.abs(x));

// String formatting
binder.addFunction('uppercase', (str) => str.toUpperCase());
binder.addFunction('lowercase', (str) => str.toLowerCase());
binder.addFunction('capitalize', (str) => 
  str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
);

// Validation
binder.addFunction('isEmail', (email) => 
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
);
```

**Usage in HTML:**

```html
<!-- Mathematical -->
<p>Rounded: {{#round(3.7)}}</p>
<p>Total Pages: {{#ceil(items.length / pageSize)}}</p>

<!-- String formatting -->
<h1>{{#uppercase(title)}}</h1>
<p>{{#capitalize(status)}}</p>

<!-- Validation -->
<input type="email" 
       data-bind="email"
       data-class="'invalid' : email !== '' && !#isEmail(email)">
```
**Notes:**
- Functions are called with `#` prefix in expressions
- Must accept exactly one argument
- Name must be a valid JavaScript identifier
- Functions have access to the passed argument only

---

## Options

Instanciating `new JSBinder()` can be made with an optional options parameter.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options` | Object | No | Configuration options |
| `options.root` | HTMLElement | No | Root element for binding scope (default: `document.body`) |

**Returns:** JSBinder instance

**Example:**

```javascript
const binder = new JSBinder({ root: document.getElementById("app") });
```

---

## Events

JSBinder dispatches custom events for all directive updates, enabling fine-grained control and monitoring.

**Event Naming:** `jsbinder-{directive}`

**Available Events:**

| Event | Directive | Detail Properties |
|-------|-----------|-------------------|
| `jsbinder-stateupdated` | setState() | None |
| `jsbinder-bind` | data-bind | `value` |
| `jsbinder-if` | data-if | `action` ("add" \| "remove") |
| `jsbinder-for` | data-for | `action` ("add" \| "remove") |
| `jsbinder-each` | data-each | `action` ("add" \| "remove") |
| `jsbinder-attr` | data-attr | `key`, `value` |
| `jsbinder-class` | data-class | `key`, `action` ("add" \| "remove") |
| `jsbinder-style` | data-style | `key`, `value` |
| `jsbinder-render` | data-render | None |

**Event Properties:**
- `e.target` - The DOM element where the directive is applied
- `e.detail` - Additional data specific to the event type
- `bubbles: true` - Events bubble up the DOM tree

**Examples:**

```javascript
// Listen to specific directive updates
document.body.addEventListener('jsbinder-bind', (e) => {
  console.log('Bind updated:', e.target, 'Value:', e.detail.value);
});
```



---

## Examples

### Table with Filter

[Live Demo](https://anders-frisk.github.io/jsbinder/demo-table-with-filter.html)

```javascript
const planets = [
  { name: "Sun", diameter: 1391016, type: "Star" },
  { name: "Mercury", diameter: 4879, type: "Terrestrial" },
  { name: "Venus", diameter: 12104, type: "Terrestrial" },
  { name: "Earth", diameter: 12742, type: "Terrestrial" },
  { name: "Mars", diameter: 6779, type: "Terrestrial" },
  { name: "Jupiter", diameter: 139820, type: "Gas" },
  { name: "Saturn", diameter: 116460, type: "Gas" },
  { name: "Uranus", diameter: 50724, type: "Ice" },
  { name: "Neptune", diameter: 49244, type: "Ice" }
];

const binder = new JSBinder();
binder.setState({
  planets,
  typeFilter: ""
});
binder.scan();
```

```html
<div>
  <label>
    Filter by type:
    <select data-bind="typeFilter" data-onchange="typeFilter = @value">
      <option value="">All Types</option>
      <option data-each="@p in planets" 
              data-key="@p.type"
              data-distinct="@p.type"
              data-orderby="@p.type"
              value="{{@p.type}}">
        {{@p.type}}
      </option>
    </select>
  </label>

  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Diameter (km)</th>
        <th>Type</th>
      </tr>
    </thead>
    <tbody>
      <tr data-each="@planet in planets" 
          data-key="@planet.name"
          data-where="typeFilter === '' || @planet.type === typeFilter">
        <td>{{@planet.name}}</td>
        <td>{{@planet.diameter}}</td>
        <td>{{@planet.type}}</td>
      </tr>
    </tbody>
  </table>
</div>
```

---

### Table with Paging

[Live Demo](https://anders-frisk.github.io/jsbinder/demo-table-with-paging.html)

```javascript
const binder = new JSBinder();

binder.addFunction('ceil', (x) => Math.ceil(x));

binder.setState({
  planets,
  page: 0,
  pageSize: 4
});

binder.scan();
```

```html
<div>
  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Diameter (km)</th>
        <th>Type</th>
      </tr>
    </thead>
    <tbody>
      <tr data-for="@i" 
          data-from="page * pageSize" 
          data-to="page * pageSize + pageSize - 1"
          data-where="planets[@i] !== undefined">
        <td>{{planets[@i].name}}</td>
        <td>{{planets[@i].diameter}}</td>
        <td>{{planets[@i].type}}</td>
      </tr>
    </tbody>
  </table>

  <div class="pagination">
    <button data-onclick="page = page - 1" 
            data-disabled="page === 0">
      Previous
    </button>
    
    <button data-for="@p" 
            data-from="1" 
            data-to="#ceil(planets.length / pageSize)"
            data-onclick="page = @p - 1"
            data-class="'active' : page === @p - 1">
      {{@p}}
    </button>
    
    <button data-onclick="page = page + 1" 
            data-disabled="page >= #ceil(planets.length / pageSize) - 1">
      Next
    </button>
  </div>
</div>
```

---

### Recursive Tree

[Live Demo](https://anders-frisk.github.io/jsbinder/demo-recursive-tree.html)

```javascript
const treeData = [
  {
    title: "Terrestrial Planets",
    items: [
      { title: "Mercury", items: [] },
      { title: "Venus", items: [] },
      { 
        title: "Earth", 
        items: [
          { title: "Moon", items: [] }
        ]
      },
      { 
        title: "Mars", 
        items: [
          { title: "Phobos", items: [] },
          { title: "Deimos", items: [] }
        ]
      }
    ]
  },
  {
    title: "Gas Giants",
    items: [
      { 
        title: "Jupiter",
        items: [
          { title: "Io", items: [] },
          { title: "Europa", items: [] },
          { title: "Ganymede", items: [] },
          { title: "Callisto", items: [] }
        ]
      },
      { 
        title: "Saturn",
        items: [
          { title: "Titan", items: [] },
          { title: "Rhea", items: [] }
        ]
      }
    ]
  },
  {
    title: "Ice Giants",
    items: [
      { title: "Uranus", items: [] },
      { title: "Neptune", items: [] }
    ]
  }
];

const binder = new JSBinder();
binder.setState({ treeData });
binder.scan();
```

```html
<template data-template="tree">
  <li data-each="@item in @data" data-key="@item.title">
    <span>{{@item.title}}</span>
    <ul data-if="@item.items.length > 0" 
        data-render="tree" 
        data-source="@item.items"></ul>
  </li>
</template>

<ul data-render="tree" data-source="treeData"></ul>
```

---

## Browser Support

JSBinder supports all modern browsers with ES6+ capabilities:

| Browser | Minimum Version |
|---------|----------------|
| Chrome | 51+ |
| Firefox | 54+ |
| Safari | 10+ |
| Edge | 15+ |
| Opera | 38+ |

**Required Features:**
- ES6 Classes
- Arrow Functions
- Template Literals
- Destructuring
- Proxy (for reactive state)
- CustomEvent
- Microtask Queue (queueMicrotask)
- structuredClone

**Polyfills:**

For older browser support, include polyfills for:
- `queueMicrotask`
- `structuredClone`
- `CustomEvent`

---

## License

JSBinder is released under the MIT License.

Copyright © 2026 Anders Frisk

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.