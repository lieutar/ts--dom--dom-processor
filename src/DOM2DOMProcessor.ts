import {  clearChildren, isDocumentFragmentNode, isDocumentNode, isElementNode, isNode, isTextNode, newDocument,
  type IWindow } from "domlib";
import { DOMProcessor, type DOMProcessorProps, type DOMProcessorRuleParam } from "./DOMProcessor";
import { Prop } from "qoop";

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
    if(isDocumentFragmentNode(node)){
      return this.processChildren(node);
    }
    if(isDocumentNode(node)){
      const doc = newDocument(this.window);
      while(doc.firstChild) doc.removeChild(doc.firstChild);
      const rs = this.process(node.documentElement) as Element;
      if(rs) doc.appendChild(rs);
      return doc;
    }
    const rs = super.process(node) as Node;
    if(isElementNode(node)) return  rs as Element;
    return rs; }

  static withRules(window:IWindow, ... rules: DOMProcessorRuleParam<Node>[]){
    const ddp = new DOM2DOMProcessor({window});
    ddp.rule(... rules);
    return ddp; }

  static basicRules:DOMProcessorRuleParam<Node>[] = [
    {
      when: isTextNode,
      action: (n) => n },
    {
      element: '*',
      action(n:Node){
        const e = clearChildren(n as Element);
        const frgm = this.processChildren(n) as DocumentFragment;
        if(frgm && frgm.childNodes.length > 0) e.appendChild(frgm);
        return e;
      }}];
}
