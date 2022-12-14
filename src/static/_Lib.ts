

// - Imports - //

import {
    Dictionary,
    RecordableType,
    CSSProperties,
    UIGenericPostProps,
    UIPreClassName,
    UIDomProps,
} from "./_Types";


// - Exports - //

export const _Lib = {


    COMPLEX_DOM_PROPS: {
        style: true,
        data: true
    },

    // - General tools - //

    /** Notes:
     * - With end smaller than start, will give the same result but in reverse.
     * - If you use stepSize, always give it a positive number. Or will loop forever.
     * - Works for integers and floats. Of course floats might do what they do even with simple adding / subtraction.
     * Examples:
     * - range(3) => [0, 1, 2]
     * - range(1, 3) => [1, 2]
     * - range(3, 1) => [2, 1]
     * - range(1, -2) => [0, -1, -2]
     * - range(-3) => [-1, -2, -3]
     */
    range(start: number, end?: number | null, stepSize: number = 1): number[] {
        // Only length given.
        if (end == null)
            [end, start] = [start, 0];
        // Go in reverse.
        const range: number[] = [];
        if (end < start) {
            for (let i=start-1; i>=end; i -= stepSize)
                range.push(i);
        }
        // Fill directly.
        else
            for (let i=start; i<end; i += stepSize)
                range.push(i);
        // Return range.
        return range;
    },

    /** Builds a record of { [key]: trueFalseLike }, which is useful for internal quick checks. */
    buildRecordable<T extends string = any>(types: RecordableType<T>): Partial<Record<T, any>> {
        if (types.constructor === Object)
            return types as Partial<Record<T, any>>;
        const tTypes: Partial<Record<T, any>> = {};
        for (const type of types as Iterable<T>)
            tTypes[type] = true;
        return tTypes;
    },

    /** Generic helper for classes with timer and method to call to execute rendering with a very specific logic.
     * - Returns the value that should be assigned as the stored timer (either existing one, new one or null). */
    refreshWithTimeout<Obj extends object>(obj: Obj, callback: (this: Obj) => void, currentTimer: number | null, defaultTimeout: number | null, forceTimeout?: number | null): number | null {
        // Clear old timer if was given a specific forceTimeout (and had a timer).
        if (currentTimer !== null && forceTimeout !== undefined) {
            window.clearTimeout(currentTimer);
            currentTimer = null;
        }
        // Execute immediately.
        const timeout = forceTimeout === undefined ? defaultTimeout : forceTimeout;
        if (timeout === null)
            callback.call(obj);
        // Or setup a timer - unless already has a timer to be reused.
        else if (currentTimer === null)
            currentTimer = window.setTimeout(() => callback.call(obj), timeout);
        // Return the timer.
        return currentTimer;
    },


    // - Html props - //

    cleanHtmlProps<Props extends UIDomProps = {}>(origProps: Props, copy?: boolean): UIGenericPostProps<Props> {
        // Copy.
        const props = copy ? { ...origProps } : origProps;
        // Class.
        if (props.class)
            props.className = props.className ? props.class + " " + props.className : props.class;
        delete props.class;
        // Style.
        if (typeof props.style === "string")
            props.style = _Lib.cleanHtmlStyle(props.style);
        // Return cleaned.
        return props as UIGenericPostProps<Props>;
    },

    // Help from: https://stackoverflow.com/questions/8987550/convert-css-text-to-javascript-object
    cleanHtmlStyle(cssText: string): CSSProperties {
        const text = cssText.replace(/\/\*(.|\s)*?\*\//g, " ").replace(/\s+/g, " ").trim();
        if (!text)
            return {};
        const style: CSSProperties = {};
        const properties = text.split(";").map(o => o.split(":").map(x => x && x.trim()));
        for (const [prop, val] of properties)
            if (prop)
                style[prop.replace(/\W+\w/g, match => match.slice(-1).toUpperCase())] = val;
        return style;
    },

    /** Returns a string to be used as class name (with no duplicates and optional nested TypeScript verification).
     * - Each item in the classNames can be:
     *     1. ValidName (single className string),
     *     2. Array<ValidName>,
     *     3. Record<ValidName, any>.
     *     + If you want to use the validation only for Arrays and Records but not Strings, add 2nd parameter `string` to the type: `classNames<ValidName, string>`
     * - Unfortunately, the name validation inputted here only works for Array and Record types, and single strings.
     * - To use concatenated class name strings (eg. "bold italic"), you should:
     *     1. Declare a validator by: `const classNames: ValidateNames<ValidName> = uiDom.classNames;`
     *     2. Then use it like this: `const okName = classNames("bold italic", ["bold"], {"italic": false, "bold": true})`;
     */
    cleanHtmlClass<ValidNames extends string = string, SingleName extends string = ValidNames>(...classNames: Array<UIPreClassName<ValidNames, SingleName> | "" | false | 0 | null | undefined>): string {
        // Collect all to a dictionary.
        const record: Record<string, true> = {};
        for (const name of classNames)
            if (name)
                _Lib.collectNamesTo(name, record, " ");
        // Return the valid keys joined by space - the collectNamesTo makes sure there's no duplicates nor empties.
        return Object.keys(record).join(" ");
    },

    /** Collects unique names as dictionary keys with value `true` for each found.
     * The names are assumed to be:
     * 1. String (use stringSplitter),
     * 2. Iterable of string names, or an iterable of this type itself (recursively).
     * 3. Record where names are keys, values tells whether to include or not. */
    collectNamesTo(names: UIPreClassName, record: Record<string, true>, stringSplitter: string = ""): void {
        // Note, this assumes names is not empty (especially not null or "").
        switch(typeof names) {
            // String, split by empty spaces.
            case "string": {
                if (stringSplitter) {
                    for (const name of names.split(stringSplitter))
                        if (name)
                            record[name] = true;
                }
                else
                    record[names] = true;
                break;
            }
            case "object": {
                // Dictionary like.
                if (names.constructor === Object) {
                    for (const name in names as Dictionary)
                        if (name && names[name])
                            record[name] = true;
                }
                // Array like.
                else {
                    // It's just a simple array - not recursive anymore, because the typing didn't work that nicely with deep stuff / recursion.
                    // .. So we just iterate each, split by " " and collect.
                    for (const cName of names as Iterable<string>) {
                        if (cName && typeof cName === "string") {
                            if (stringSplitter) {
                                for (const name of cName.split(stringSplitter))
                                    if (name)
                                        record[name] = true;
                            }
                            else
                                record[cName] = true;
                        }
                    }
                    // for (const preName of names as Iterable<UIPreClassName>)
                    //     if (preName)
                    //         _Lib.collectNamesTo(preName, record, stringSplitter);
                }
                break;
            }
        }
    },

    /** Get diffs in class names in the form of: Record<string, boolean>, where true means added, false removed, otherwise not included.
     * - Note. This process only checks for changes - it ignores changes in order completely. */
    getClassNameDiffs(origName?: string, newName?: string): Record<string, boolean> | null {
        // Quick check.
        origName = origName || "";
        newName = newName || "";
        if (origName === newName)
            return null;
        // Prepare outcome.
        const origNames = origName.split(" ");
        const newNames = newName.split(" ");
        const diffs = {};
        // Removed.
        let did: null | boolean = null;
        if (origNames)
    		for (const name of origNames) {
    			if (name && (!newNames || newNames.indexOf(name) === -1))
    				diffs[name] = did = false;
    		}
        // Added.
        if (newNames)
    		for (const name of newNames) {
    			if (name && (!origNames || origNames.indexOf(name) === -1))
    				diffs[name] = did = true;
    		}
        // Return diffs if has any.
        return did !== null ? diffs : null;
    },

    getDictionaryDiffs<T extends Dictionary>(orig: Partial<T>, update: Partial<T>): Partial<T> | null {
        // Collect.
        const diffs: Partial<T> = {};
        let hasDiffs = false;
        // .. Deleted.
        for (const prop in orig) {
            const origValue = orig[prop];
            if (origValue !== undefined && update[prop] === undefined) {
                diffs[prop] = undefined;
                hasDiffs = true;
            }
	    }
        // .. Added or changed.
        for (const prop in update) {
            const newValue = update[prop];
            if (orig[prop] !== newValue) {
                diffs[prop] = newValue;
                hasDiffs = true;
            }
        }
        return hasDiffs ? diffs : null;
    },

    /** Inlined comparison method specialized into domProps (attributes of a dom element). */
    equalDomProps(a: UIGenericPostProps, b: UIGenericPostProps): boolean {
        // Handle complex properties.
        for (const prop in _Lib.COMPLEX_DOM_PROPS) {
            // .. At least a has the complex prop.
            if (a[prop]) {
                // But b has no the complex prop.
                if (!b[prop])
                    return false;
                // Compare complex data (as shallow dictionaries).
                const aData = a[prop];
                const bData = b[prop];
                // .. Added or changed.
                if (aData !== bData) {
            		for (const prop in bData) {
            			if (aData[prop] !== bData[prop])
            				return false;
            		}
                    // .. Deleted.
            		for (const prop in aData) {
            			if (bData[prop] === undefined && aData[prop] !== undefined)
            				return false;
            		}
                }
            }
            // .. Only b has style.
            else if (b[prop])
                return false;
        }
        // All else.
        // .. Added or changed.
        for (const prop in b) {
            if (a[prop] !== b[prop] && !_Lib.COMPLEX_DOM_PROPS[prop])
                return false;
        }
        // .. Deleted.
        for (const prop in a) {
            if (b[prop] === undefined && a[prop] !== undefined && !_Lib.COMPLEX_DOM_PROPS[prop])
                return false;
        }
        return true;
    },


    // - Equality - //

    /** General inlined equal with level for deepness.
     * - nDepth: 0. No depth - simple check.
     * - nDepth: 1. Shallow equal.
     * - nDepth: 2. Shallow double equal.
     * - nDepth < 0. Deep. */
    areEqual(a: any, b: any, nDepth = -1): boolean {
        // Identical.
        if (a === b)
            return true;
        // Object.
        if (a && nDepth && typeof a === "object") {
            // Incompatible.
            if (!b || typeof b !== "object")
                return false;
            // Check constructor.
            // .. Note that for classes, we would do this specifically anyway.
            // .. In other words, classes get handled without any specific rules: by this check and below like an object.
            const constr = a.constructor;
            if (constr !== b.constructor)
                return false;
            // Next level.
            nDepth--;
            // Prepare subtype.
            let isArr = false;
            switch(constr) {
                case Object:
                    break;
                case Array:
                    isArr = true;
                    break;
                case Set:
                    isArr = true;
                    a = [...a];
                    b = [...b];
                    break;
                case Map:
                    if (a.size !== b.size)
                        return false;
                    for (const [k, v] of a) {
                        if (!b.has(k))
                            return false;
                        if (nDepth ? !_Lib.areEqual(b.get(k), v, nDepth) : b.get(k) !== v)
                            return false;
                    }
                    return true;
                default:
                    // Array like.
                    const subType = a.toString();
                    if (subType === "[object NodeList]" || subType === "[object HTMLCollection]")
                        isArr = true;
                    break;
            }
            // Array like.
            if (isArr) {
                const count = a.length;
                if (count !== b.length)
                    return false;
                for (let i=0; i<count; i++)
                    if (nDepth ? !_Lib.areEqual(a[i], b[i], nDepth) : a[i] !== b[i])
                        return false;
            }
            // Anything object-like - hoping that works for anything else.
            // .. Note. This works for arrays as well (though slower), but NodeList and HTMLCollection has extras. And not for Sets nor Maps.
            else {
                // Added or changed.
                for (const p in b) {
                    if (!a.hasOwnProperty(p))
                        return false;
                    if (nDepth ? !_Lib.areEqual(a[p], b[p], nDepth) : a[p] !== b[p])
                        return false;
                }
                // Deleted.
                for (const p in a) {
                    if (!b.hasOwnProperty(p))
                        return false;
                }
            }
            // No diffs found.
            return true;
        }
        // Otherwise not equal, because are not objects and were not identical (checked earlier already).
        return false;
    },

}
