import { Injectable } from '@angular/core'
import { SettingsTabProvider } from 'tabby-settings'
import { CommandCompletionSettingsTabComponent } from './settingsTab.component'

@Injectable()
export class CommandCompletionSettingsTabProvider extends SettingsTabProvider {
    id = 'command-completion'
    icon = 'terminal'
    title = 'Command completion'

    getComponentType (): any {
        return CommandCompletionSettingsTabComponent
    }
}
