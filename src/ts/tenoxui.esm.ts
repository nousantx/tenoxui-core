/*!
 * tenoxui/core v1.0.0-alpha.4
 * Licensed under MIT (https://github.com/tenoxui/css/blob/main/LICENSE)
 */

// makeTenoxUI constructor bparam
interface MakeTenoxUIParams {
  element: HTMLElement | NodeListOf<HTMLElement>;
  property?: Property;
  values?: DefinedValue;
  breakpoint?: Breakpoint[];
  classes?: Classes;
}
// type and property
type Property = {
  [type: string]: string | string[] | { property?: string | string[]; value?: string };
};
// Breakpoint
type Breakpoint = { name: string; min?: number; max?: number };
// value registry
type DefinedValue = { [type: string]: { [value: string]: string } | string };
// defined class name with exact property
type Classes = {
  [property: string]: {
    [className: string]: string;
  };
};

// makeTenoxUI
class makeTenoxUI {
  // selectors
  private readonly htmlElement: HTMLElement;
  // types and properties
  private readonly styleAttribute: Property;
  // stored values
  private readonly valueRegistry: DefinedValue;
  // breakpoints
  private readonly breakpoints: Breakpoint[];
  // classes
  private readonly classes: Classes;
  // makeTenoxUI constructor
  constructor({ element, property = {}, values = {}, breakpoint = [], classes = {} }: MakeTenoxUIParams) {
    this.htmlElement = element instanceof HTMLElement ? element : element[0];
    this.styleAttribute = property;
    this.valueRegistry = values;
    this.breakpoints = breakpoint;
    this.classes = classes;
  }
  // logic for handling all defined value from the classnames
  private valueHandler(type: string, value: string, unit: string): string {
    // use `values` from `valueRegistry` if match
    const registryValue = this.valueRegistry[value] as string;
    const properties = this.styleAttribute[type];
    // use `values` from registry or default value
    let resolvedValue = registryValue || value;

    // If no value is provided, and properties has a predefined value, use it
    if (typeof properties === "object" && "value" in properties && !properties.value.includes("{value}")) {
      return properties.value;
    }
    // css variable classname, started with `$` and the value after it will treated as css variable
    else if (resolvedValue.startsWith("$")) {
      return `var(--${resolvedValue.slice(1)})`;
    }
    // custom value handler
    else if (resolvedValue.startsWith("[") && resolvedValue.endsWith("]")) {
      const solidValue = resolvedValue.slice(1, -1).replace(/\\_/g, " ");
      return solidValue.startsWith("--") ? `var(${solidValue})` : solidValue;
    }
    // custom value for each `type` handler, available only for defined type
    const typeRegistry = this.valueRegistry[type];
    if (typeof typeRegistry === "object") {
      resolvedValue = typeRegistry[value] || resolvedValue;
    }
    // return resolvedValue
    return resolvedValue + unit;
  }
  // css variable values handler
  private setCssVar(variable: string, value: string): void {
    // set the variable and the value
    this.htmlElement.style.setProperty(variable, value);
  }
  // custom value handler
  private setCustomValue(properties: { property: string | string[]; value?: string }, resolvedValue: string): void {
    // get the `property` and `value` from defined custom value / `properties`
    const { property, value } = properties;
    // store resolved value
    let finalValue = resolvedValue;
    // if `properties` has `value`'s value, replace the `{value}` with the resolved value
    if (value) {
      finalValue = value.replace(/{value}/g, resolvedValue);
    }
    // single property handler
    // css variable handler
    if (typeof property === "string") {
      // get the css variable value, if started with `--{property}`
      if (property.startsWith("--")) {
        // set property with final value
        this.setCssVar(property, finalValue);
      }
      // else, if default property, set the finalValue for the `property`
      else {
        (this.htmlElement.style as any)[property] = finalValue;
      }
    }
    // multiple `property` within propeties
    else if (Array.isArray(property)) {
      property.forEach(prop => {
        // goes same actually...
        if (typeof prop === "string" && prop.startsWith("--")) {
          this.setCssVar(prop, finalValue);
        } else {
          (this.htmlElement.style as any)[prop] = finalValue;
        }
      });
    }
  }
  // handle custom classes
  private setCustomClass(type: string, value: string): void {
    (this.htmlElement.style as any)[type] = value;
  }
  // regular `types` and `properties` handler
  private setDefaultValue(properties: string | string[], resolvedValue: string): void {
    // isArray?
    const propsArray = Array.isArray(properties) ? properties : [properties];
    // iterate properties into single property
    propsArray.forEach(property => {
      // same styler, again...
      if (typeof property === "string" && property.startsWith("--")) {
        this.setCssVar(property, resolvedValue);
      } else {
        (this.htmlElement.style as any)[property] = resolvedValue;
      }
    });
  }

  // match point
  private matchBreakpoint(bp: Breakpoint, prefix: string, width: number): boolean {
    // don't ask me... :(
    if (bp.name !== prefix) return false;
    if (bp.min !== undefined && bp.max !== undefined) {
      return width >= bp.min && width <= bp.max;
    }
    if (bp.min !== undefined) return width >= bp.min;
    if (bp.max !== undefined) return width <= bp.max;
    return false;
  }
  // utility to turn `camelCase` into `kebab-case`
  private camelToKebab(str: string): string {
    // return the
    return str.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`);
    // reason? The pseudo handler not working properly whenever the property defined with `camelCase`
  }
  // responsive className handler
  private handleResponsive(
    breakpointPrefix: string,
    type: string,
    value: string,
    unit: string,
    propKey?: string
  ): void {
    const properties = this.styleAttribute[type];

    const handleResize = () => {
      const windowWidth = window.innerWidth;
      const matchPoint = this.breakpoints.find(bp => this.matchBreakpoint(bp, breakpointPrefix, windowWidth));

      // apply exact styles if matches
      console.log("responsive: ", type, value, unit, propKey);
      if (matchPoint) {
        // object `type` style
        if (this.isObjectWithValue(properties)) {
          this.addStyle(type);
        } else if (propKey && this.classes[propKey]) {
          this.addStyle(type, value, unit, propKey);
        } else {
          // apply regular style
          this.addStyle(type, value, unit);
        }
      } else {
        // remove value
        this.htmlElement.style[type as any] = "";
      }
    };

    // start the resize handler
    handleResize();
    // apply when the screen size is changing
    window.addEventListener("resize", handleResize);
  }

  // utility to get the type from the property's name
  private getPropName(type: string, propKey?: string): string | string[] {
    if (type.startsWith("[--") && type.endsWith("]")) {
      return type.slice(1, -1);
    }
    // is the property was from custom value, or regular property
    const property = (this.styleAttribute[type] as any)?.property || this.styleAttribute[type];

    // is the property defined as an array?
    if (propKey && this.classes[propKey]) {
      return this.camelToKebab(propKey);
    } else if (Array.isArray(property)) {
      return property.map(this.camelToKebab);
    } else {
      return this.camelToKebab(property as string);
    }
  }

  // utility method to get the initial value before the pseudo initialization
  private getInitialValue(propsName: string | string[]): { [key: string]: string } | string {
    if (Array.isArray(propsName)) {
      return propsName.reduce(
        (acc, propName) => {
          acc[propName] = this.htmlElement.style.getPropertyValue(propName);
          return acc;
        },
        {} as { [key: string]: string }
      );
    }
    return this.htmlElement.style.getPropertyValue(propsName);
  }

  // revert value when the listener is done
  private revertStyle(propsName: string | string[], styleInitValue: { [key: string]: string } | string): void {
    // if the property is defined as an object / multiple properties
    if (Array.isArray(propsName)) {
      propsName.forEach(propName => {
        this.setCssVar(propName, (styleInitValue as { [key: string]: string })[propName]);
      });
    }
    // single property
    else {
      this.setCssVar(propsName, styleInitValue as string);
    }
  }

  // pseudo handler
  private pseudoHandler(
    type: string,
    value: string,
    unit: string,
    pseudoEvent: string,
    revertEvent: string,
    propKey?: string // conditional css property from this classes
  ): void {
    // the type's name inside of property
    const properties = this.styleAttribute[type];
    // get the property's name
    const propsName = propKey ? this.getPropName("", propKey) : this.getPropName(type);
    // get initial style
    const styleInitValue = this.getInitialValue(propsName);

    // applyStyle logic
    const applyStyle = () => {
      // is the properties an object?
      if (this.isObjectWithValue(properties)) {
        // if has "{value}", use regular styling method
        if (properties.value.includes("{value}")) {
          this.addStyle(type, value, unit);
        } else {
          // if doesn't have any "{value}", get only the type, as className
          this.addStyle(type);
        }
      } else if (propKey && this.classes[propKey][type]) {
        this.addStyle(type, value, "", propKey);
      } else {
        // else, use default styling
        this.addStyle(type, value, unit);
      }
    };

    // revert style helper
    const revertStyle = () => this.revertStyle(propsName, styleInitValue);

    // add the listener
    this.htmlElement.addEventListener(pseudoEvent, applyStyle);
    this.htmlElement.addEventListener(revertEvent, revertStyle);
  }

  // main styler, handling the type, property, and value
  public addStyle(type: string, value?: string, unit?: string, classProp?: string): void {
    // get css property from styleAttribute
    const properties = this.styleAttribute[type];
    // get class name from custom class
    const definedClass = this.classes;

    // use className from `definedClass` instead
    if (definedClass[classProp]) {
      // apply style using setCustomClass method
      this.setCustomClass(classProp, value);
      return;
    }

    // if no value is provided and properties is an object with a 'value' key, use that value
    if (!value && this.isObjectWithValue(properties)) {
      // use value from custom value
      value = properties.value;
    }

    // don't process type with no value
    if (!value) return;

    // compute values
    let resolvedValue = this.valueHandler(type, value, unit || "");

    // other condition to apply the styles
    // css variable className
    if (type.startsWith("[--") && type.endsWith("]")) {
      this.setCssVar(type.slice(1, -1), resolvedValue);
    }
    // custom value handler
    else if (typeof properties === "object" && "property" in properties) {
      this.setCustomValue(properties as { property: string | string[]; value?: string }, resolvedValue);
    }
    // regular/default value handler
    else if (properties) {
      this.setDefaultValue(properties as string | string[], resolvedValue);
    }
  }

  // function to match the classnames with the correct handler
  private parseClassName(
    className: string
  ): [string | undefined, string, string | undefined, string | undefined] | null {
    // using regexp to parse all possible class names
    const match = className.match(
      /(?:([a-zA-Z0-9-]+):)?(-?[a-zA-Z0-9_]+(?:-[a-zA-Z0-9_]+)*|\[--[a-zA-Z0-9_-]+\])-(-?(?:\d+(\.\d+)?)|(?:[a-zA-Z0-9_]+(?:-[a-zA-Z0-9_]+)*(?:-[a-zA-Z0-9_]+)*)|(?:#[0-9a-fA-F]+)|(?:\[[^\]]+\])|(?:\$[^\s]+))([a-zA-Z%]*)/
    );

    // don't do anything if the class name is didn't match, maybe that is class name from outside tenoxui environment
    if (!match) return null;

    // returning parsed class name
    const [, prefix, type, value, , unit] = match;
    return [prefix, type, value, unit];
  }

  // get value from custom value
  private isObjectWithValue(typeAttribute: any): typeAttribute is { property: string | string[]; value: string } {
    return (
      // is the styleAttribute[type] is an object
      typeof typeAttribute === "object" &&
      // the styleAttribute[type] must have a value
      typeAttribute !== null &&
      // value in styleAttribute[type]
      "value" in typeAttribute &&
      // property in styleAttribute[type]
      "property" in typeAttribute
    );
  }

  public applyStyles(className: string): void {
    // split className, get the prefix and the actual className
    const [prefix, type] = className.split(":");
    const getType = type || prefix;
    const getPrefix = type ? prefix : undefined;

    // handle predefined styles in styleAttribute
    if (this.handlePredefinedStyle(getType, getPrefix)) return;

    // handle custom classes
    if (this.handleCustomClass(getType, getPrefix)) return;

    // Parse and apply regular styles
    const parts = this.parseClassName(className);
    if (!parts) return;

    const [parsedPrefix, parsedType, value, unit] = parts;
    this.applyParsedStyle(parsedPrefix, parsedType, value, unit);
  }

  private handlePredefinedStyle(type: string, prefix?: string): boolean {
    const properties = this.styleAttribute[type];
    if (properties && this.isObjectWithValue(properties)) {
      const value = properties.value;
      if (prefix) {
        this.applyPrefixedStyle(prefix, type, value, "");
      } else {
        this.addStyle(type);
      }
      return true;
    }
    return false;
  }

  private handleCustomClass(type: string, prefix?: string): boolean {
    const propKey = this.getParentClass(type);
    if (propKey) {
      const value = this.classes[propKey][type];
      if (prefix) {
        this.applyPrefixedStyle(prefix, type, value, "", propKey);
      } else {
        this.addStyle(type, value, "", propKey);
      }
      return true;
    }
    return false;
  }

  private applyParsedStyle(prefix: string | undefined, type: string, value: string, unit: string | undefined): void {
    if (prefix) {
      this.applyPrefixedStyle(prefix, type, value, unit);
    } else {
      this.addStyle(type, value, unit);
    }
  }

  private applyPrefixedStyle(prefix: string, type: string, value: string, unit: string, propKey?: string): void {
    switch (prefix) {
      case "hover":
        this.pseudoHandler(type, value, unit, "mouseover", "mouseout", propKey);
        break;
      case "focus":
        this.pseudoHandler(type, value, unit, "focus", "blur", propKey);
        break;
      default:
        this.handleResponsive(prefix, type, value, unit, propKey);
    }
  }

  // get parent css property from custom classes
  private getParentClass(className: string): string | null {
    const classObject = this.classes;
    for (const cssProperty in classObject) {
      if (classObject[cssProperty].hasOwnProperty(className)) {
        // return the property
        return cssProperty;
      }
    }
    return null;
  }

  // just applyStyles, but with more confidential :)
  public applyMultiStyles(styles: string): void {
    // splitting the styles and apply each styles with applyStyles method
    styles.split(/\s+/).forEach(style => this.applyStyles(style));
  }
}

export { makeTenoxUI };
