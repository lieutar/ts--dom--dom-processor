import { Prop, QoopObject } from "qoop";
import { isDocumentFragmentNode, isDocumentNode, isElementNode, isNode, isTextNode,
  type IWindow, newDocument } from "domlib";

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
      if(!tagName || tagName.match(/^\s*\*\*$/)) return ()=>true;
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
    if(node) return this.processSiblings(node.firstChild);
    return null; }

}

export interface DOM2DOMProcessorProps extends DOMProcessorProps<Node>{ window: IWindow; }

export class DOM2DOMProcessor extends DOMProcessor<Node>{
  @Prop() window!:IWindow;

  constructor(params: Pick<DOM2DOMProcessorProps, 'window'>){
    super({... params, output: (buf:unknown[])=>{
      const frgm = this.window.document.createDocumentFragment();
      for(const b of buf) if(isNode(b)) frgm.appendChild(b);
      return frgm;
    }});
  }

  override process(node: Document):Document;
  override process(node: DocumentFragment):DocumentFragment;
  override process(node: Element):Element;
  override process(node: Node|null):Node|null{
    const rs = super.process(node) as Node;
    if(isDocumentFragmentNode(node)) return rs as DocumentFragment;
    if(isDocumentNode(node)){
      const doc = newDocument(window);
      while(doc.firstChild) doc.removeChild(doc.firstChild);
      doc.appendChild(doc.importNode(rs));
      return doc;
    }
    if(isElementNode(node)) return rs as Element;
    return rs; }

  static withRules(window:IWindow, ... rules: DOMProcessorRuleParam<Node>[]){
    const ddp = new DOM2DOMProcessor({window});
    ddp.rule(... rules);
    return ddp; }
}

export interface DOM2TextProcessorProps extends DOMProcessorProps<string>{}

export class DOM2TextProcessor extends DOMProcessor<string>{
  override process(node: Node):string;
  override process(node: null):null;
  override process(node: Node|null):string|null{ return super.process(node) as string | null;}

  override processChildren(node: Node):string;
  override processChildren(node: null):null;
  override processChildren(node: Node|null):string|null{ return super.processChildren(node) as string | null; }

  static withRules(... rules: DOMProcessorRuleParam<string>[]){
    const dtp = new DOM2TextProcessor();
    dtp.rule(... rules);
    return dtp; }

  static basicRules: DOMProcessorRuleParam<string>[] = [
    {
      when: isTextNode,
      action: (n) => {
        const str = n.textContent ?? '';
        if(str.match(/^\s*$/)) return '';
        return str;
      } },
    {
      element: '*',
      action(n:Node){
        return this.process(n) as string; } },
  ];

}
