import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'forgeFormat',
  standalone: true
})
export class ForgeFormatPipe implements PipeTransform {
  transform(value: number | string | null | undefined): string {
    const parsed = Number(value ?? 0);
    if (Number.isNaN(parsed)) {
      return '0.00 $FORGE';
    }

    return `${parsed.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} $FORGE`;
  }
}
