import { Component } from '@angular/core'
import { ModalController, AlertController } from '@ionic/angular'
import { ICoinProtocol } from '@airgap/coinlib-core'

import { ErrorCategory, handleErrorLocal } from '../../services/error-handler/error-handler.service'
import { NavigationService } from '../../services/navigation/navigation.service'
import { SecretsService } from '../../services/secrets/secrets.service'
import { VaultStorageKey, VaultStorageService } from '../../services/storage/storage.service'
import { LocalAuthenticationOnboardingPage } from '../local-authentication-onboarding/local-authentication-onboarding.page'
import { BIP39_PASSPHRASE_ENABLED } from 'src/app/constants/constants'
import { ProtocolService } from '@airgap/angular-core'

@Component({
  selector: 'airgap-account-add',
  templateUrl: './account-add.page.html',
  styleUrls: ['./account-add.page.scss']
})
export class AccountAddPage {
  public selectedProtocol: ICoinProtocol
  public protocols: ICoinProtocol[]
  public isHDWallet: boolean = false

  public isAdvancedMode: boolean = false
  public isBip39PassphraseEnabled: boolean = BIP39_PASSPHRASE_ENABLED
  public revealBip39Passphrase: boolean = false
  public customDerivationPath: string
  public bip39Passphrase: string = ''

  constructor(
    private readonly secretsService: SecretsService,
    private readonly storageService: VaultStorageService,
    private readonly protocolService: ProtocolService,
    private readonly modalController: ModalController,
    private readonly navigationService: NavigationService,
    private readonly alertController: AlertController
  ) {
    this.protocolService.getActiveProtocols().then((protocols: ICoinProtocol[]) => {
      this.protocols = protocols
      this.onSelectedProtocolChange(this.navigationService.getState().protocol || this.protocols[0])
    })
  }

  public async setDerivationPath() {
    if ((await this.selectedProtocol.getSupportsHD()) && this.isHDWallet) {
      this.customDerivationPath = await this.selectedProtocol.getStandardDerivationPath()
    } else {
      this.customDerivationPath = `${await this.selectedProtocol.getStandardDerivationPath()}/0/0`
    }
  }

  public async onSelectedProtocolChange(selectedProtocol: ICoinProtocol): Promise<void> {
    this.selectedProtocol = selectedProtocol
    this.isHDWallet = await this.selectedProtocol.getSupportsHD()
    this.customDerivationPath = await this.selectedProtocol.getStandardDerivationPath()
  }

  public async addWallet(): Promise<void> {
    const value: boolean = await this.storageService.get(VaultStorageKey.DISCLAIMER_HIDE_LOCAL_AUTH_ONBOARDING)
    if (!value) {
      const modal: HTMLIonModalElement = await this.modalController.create({
        component: LocalAuthenticationOnboardingPage
      })

      modal
        .onDidDismiss()
        .then(() => {
          this.addWalletAndReturnToAddressPage()
        })
        .catch(handleErrorLocal(ErrorCategory.IONIC_MODAL))

      modal.present().catch(handleErrorLocal(ErrorCategory.IONIC_MODAL))
    } else {
      this.addWalletAndReturnToAddressPage()
    }
  }

  private async addWalletAndReturnToAddressPage(): Promise<void> {
    const addAccount = async () => {
      const selectedProtocolIdentifier = await this.selectedProtocol.getIdentifier()
      this.secretsService
        .addWallets(
          await Promise.all(this.protocols.map(async (protocol: ICoinProtocol) => {
            const protocolIdentifier = await protocol.getIdentifier()

            const isSelected: boolean = selectedProtocolIdentifier === protocolIdentifier

            return {
              protocolIdentifier,
              isHDWallet: isSelected ? this.isHDWallet : await protocol.getSupportsHD(),
              customDerivationPath: isSelected ? this.customDerivationPath : await protocol.getStandardDerivationPath(),
              bip39Passphrase: isSelected ? this.bip39Passphrase : '',
              isActive: isSelected
            }
          })
        ))
        .then(() => {
          this.navigationService.routeToAccountsTab().catch(handleErrorLocal(ErrorCategory.IONIC_NAVIGATION))
        })
        .catch(handleErrorLocal(ErrorCategory.SECURE_STORAGE))
    }

    if (this.bip39Passphrase.length > 0) {
      const alert = await this.alertController.create({
        header: 'BIP-39 Passphrase',
        message:
          'You set a BIP-39 Passphrase. You will need to enter this passphrase again when you import your secret. If you lose your passphrase, you will lose access to your account!',
        backdropDismiss: false,
        inputs: [
          {
            name: 'understood',
            type: 'checkbox',
            label: 'I understand',
            value: 'understood',
            checked: false
          }
        ],
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel'
          },
          {
            text: 'Ok',
            handler: async (result: string[]) => {
              if (result.includes('understood')) {
                addAccount()
              }
            }
          }
        ]
      })
      alert.present()
    } else {
      addAccount()
    }
  }
}
