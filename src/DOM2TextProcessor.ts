import { isTextNode } from "domlib";
import { DOMProcessor, type DOMProcessorProps, type DOMProcessorRuleParam } from "./DOMProcessor";

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
        //console.log(n.tagName);
        return this.process(n) as string; } },
  ];

}
