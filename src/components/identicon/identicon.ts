import { Component, Input } from '@angular/core'
import { toDataUrl } from 'ethereum-blockies'
import { createIcon } from '@download/blockies'

/**
 * Generated class for the IdenticonComponent component.
 *
 * See https://angular.io/api/core/Component for more info on Angular
 * Components.
 */
@Component({
  selector: 'identicon',
  templateUrl: 'identicon.html'
})
export class IdenticonComponent {

  private identicon

  @Input()
  set address(value: string) {
    if (value.startsWith('ak_')) {
      this.identicon = createIcon({ seed: value }).toDataURL()
    } else {
      this.identicon = toDataUrl(value.toLowerCase())
    }
  }
}
