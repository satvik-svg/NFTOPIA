import { Directive, ElementRef, Input, OnInit, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appTooltip]',
  standalone: true
})
export class TooltipDirective implements OnInit {
  @Input('appTooltip') tooltip = '';

  constructor(
    private readonly el: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2
  ) {}

  ngOnInit(): void {
    if (this.tooltip) {
      this.renderer.setAttribute(this.el.nativeElement, 'title', this.tooltip);
    }
  }
}
