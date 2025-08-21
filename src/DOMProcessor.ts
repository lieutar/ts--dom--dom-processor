import { Prop, QoopObject } from "qoop";
import { isDocumentFragmentNode, isDocumentNode, isElementNode } from "domlib";

export interface DOMProcessorRule<T = unknown> {
  when(this:DOMProcessor, node:Node):boolean;
  action(this:DOMProcessor, node:Node):T; }

export type DOMProcessorRuleParam<T = unknown> = Pick<DOMProcessorRule<T>, 'action'> &
        (Pick<DOMProcessorRule<T>, 'when'> | {element: string});

export type DOMProcessorOutputType<T> = (buf: unknown[])=>T;
export interface DOMProcessorProps<T> {
 output:  DOMProcessorOutputType<T>; }

export class DOMProcessor<T = unknown> extends QoopObject(){

  constructor(params: Partial<DOMProcessorProps<T>> = {}){
    super({output: (buf:unknown[]) => buf.join('')  , ... params }); }
  @Prop() output!: DOMProcessorOutputType<T>;

  private _rules:DOMProcessorRule[] = [];

  rule(... rules: DOMProcessorRuleParam<T>[]){
    this._rules.push(... rules.map((src => {
      if('when' in src) return src as DOMProcessorRule;
      return { ... src, when: (n:Node) => this.isElement(n, src.element) } as DOMProcessorRule; }))); }

  isRoot(node: Node):boolean{
    return isElementNode(node) && node.ownerDocument && node.ownerDocument.documentElement === node; }

  isElement(node: Node, tagName?:string):boolean{
    const matcher = (()=>{
      if(!tagName || tagName.match(/^\s*\*\s*$/)){
        return ()=>true;
      }
      if(tagName.match(/^\s*\/\s*$/)) return ()=> !!node.ownerDocument && node.ownerDocument.documentElement === node;
      return ()=>(node as Element).tagName === tagName; })();
    return isElementNode(node) && matcher();
  }

  getMatchedRule(node:Node):DOMProcessorRule | null{
    for(const rule of this._rules) if(rule.when.call(this, node)) return rule;
    return null; }

  process(node:Node | null):unknown|null{
    if(node){
      if(isDocumentNode(node)) return this.process((node as Document).documentElement);
      if(isDocumentFragmentNode(node)) return this.processSiblings(node.firstChild);
      const matched = this.getMatchedRule(node);
      if(matched) return matched.action.call(this, node); }
    return null; }

  processSiblings(node: Node|null):T | null{
    if(node){
      const buf: unknown[] = [];
      let n : Node | null = node;
      while(n){
        const matched = this.getMatchedRule(n);
        if(matched) buf.push(matched.action.call(this, n));
        n = n.nextSibling; }
      return this.output(buf); }
    return null; }

  processChildren(node: Node|null):T | null{
    if(!node) return null;
    return this.processSiblings(node.firstChild); }

}
