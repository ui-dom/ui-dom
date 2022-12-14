

// - Imports - //

import { ClassBaseMixer, ClassType, UICompareDepthByMode, UIUpdateCompareMode } from "../static/_Types";
import { _Lib } from "../static/_Lib";


// - UIEffect (stand alone) - //

/** Effect to run when memory has changed (according to the comparison mode).
 * - If returns a new effect function, it will be run when unmounting the effect. */
export type UIEffectOnMount<Memory = any> = (prevMem: Memory, newMem: Memory) => void | UIEffectOnUnmount;
export type UIEffectOnUnmount<Memory = any> = (prevMem: Memory, newMem: Memory, why: "use" | "cancel") => void;
function _UIEffectMixin<Memory = any>(Base: ClassType) {

    return class _UIEffect extends Base {

        public static UI_DOM_TYPE = "Effect";

        memory: Memory;
        onMount: UIEffectOnMount | null;
        onUnmount: UIEffectOnUnmount | null;
        depth: number;

        constructor(effect?: UIEffectOnMount<Memory>, memory?: Memory, ...baseParams: any[]) {
            super(...baseParams);
            this.memory = memory as Memory;
            this.onMount = effect || null;
            this.onUnmount = null;
            this.depth = 1;
        }

        public setDepth(depth?: number | UIUpdateCompareMode | null): void {
            this.depth = depth == null ? 1 : typeof depth === "string" ? UICompareDepthByMode[depth] : depth;
        }

        public reset(effect: UIEffectOnMount<Memory> | null, memory: Memory, forceRun: boolean = false): boolean {
            return this.use(memory, forceRun, effect);
        }

        public use(memory: Memory, forceRun: boolean = false, newEffectIfChanged?: UIEffectOnMount<Memory> | null): boolean {
            // Get.
            const memWas = this.memory;
            // No change.
            if (!forceRun && this.depth > -2 && _Lib.areEqual(memWas, memory, this.depth))
                return false;
            // Store the memory if changed.
            this.memory = memory;
            // Update effect.
            if (newEffectIfChanged !== undefined) {
                if (this.onUnmount)
                    this.onUnmount(memWas, memory, "use");
                this.onUnmount = null;
                this.onMount = newEffectIfChanged;
            }
            // Run effect.
            if (this.onMount)
                this.onUnmount = this.onMount(memWas, memory) || null;
            // Did not change in given mode.
            return false;
        }

        /** Cancel effect. */
        public cancel(runUnmount: boolean = true, clearEffect: boolean = false): void {
            // Run unmount.
            if (runUnmount && this.onUnmount)
                this.onUnmount(this.memory, this.memory, "cancel");
            // Clear.
            if (clearEffect) {
                this.onMount = null;
                this.onUnmount = null;
            }
        }
    }
}
export interface UIEffect<Memory = any> {

    // Note that the type for Memory is not used elsewhere below.
    // ... This is to allow more flexible mixin use with redefined memory.
    /** The last store memory. */
    memory: Memory;

    /** The effect to run, when has changed.
     * - If returns a function, will replace the effect after (for the next time). */
    onMount: UIEffectOnMount<Memory> | null;
    /** This is automatically assigned by the return value of the onMount - if doesn't return a func, will assing to null. */
    onUnmount: UIEffectOnUnmount<Memory> | null;

    /** Comparison mode to be used by default. (Defaults to 1, which is the same as "shallow".)
    * - If -1 depth, performs fully deep search. If depth <= -2, then is in "always" mode (doesn't even check). */
    depth: number;

    /** Main function for using the effect.
     * - Compares the memory against the old one and if changed, returns true and runs the effect.
     * - If newEffectIfChanged provided, overrides the effect (only if was changed) right before calling the effect.
     * - Note that you don't need to have an effect assigned at all: you can also use the returned boolean and run your "effect" inline. */
    use(memory: this["memory"], forceRun?: boolean, newEffectIfChanged?: UIEffectOnMount<Memory> | null): boolean;

    /** Alias for .use, that requires a function. (Do not use this, if you can reuse a function.)
     * - Note that if you can reuse a function all the time, you should. (There's no point declaring a new one every time in vain.)
     * - Note that you can also call .update(mem), and if it returns true, then do your effect inline.  */
    reset(effect: UIEffectOnMount<Memory> | null, memory: this["memory"], forceRun?: boolean): boolean;

    /** Cancel effect. */
    cancel(skipUnmount?: boolean, clearEffect?: boolean): void;

    /** Set the comparison depth using a number or the shortcut names in UIUpdateCompareMode. */
    setDepth(depth?: number | UIUpdateCompareMode | null): void;

}
export class UIEffect<Memory = any> extends _UIEffectMixin(Object) {}
export const createEffect = <Memory = any>(effect?: UIEffectOnMount<Memory>, memory?: Memory) => new UIEffect<Memory>(effect, memory);

/** There are two ways you can use this:
 * 1. Call this to give basic UIEffect features.
 *      * For example: `class MyMix extends UIEffectMixin(MyBase) {}`
 * 2. If you want to define Memory, use this simple trick instead:
 *      * For example: `class MyMix extends (UIEffectMixin as ClassBaseMixer<UIEffect<MyMemory>>)(MyBase) {}`
 */
export const UIEffectMixin = _UIEffectMixin as ClassBaseMixer<UIEffect>;
