import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { ConfigProvider } from 'tabby-core'
import { TerminalDecorator } from 'tabby-terminal'
import { SettingsTabProvider } from 'tabby-settings'
import { CommandCompletionConfigProvider } from './config'
import { CommandCompletionDecorator } from './decorator'
import { CommandHistoryStore } from './historyStore'
import { CommandCompletionSettingsTabComponent } from './settingsTab.component'
import { CommandCompletionSettingsTabProvider } from './settingsTabProvider'

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
    ],
    providers: [
        CommandHistoryStore,
        { provide: ConfigProvider, useClass: CommandCompletionConfigProvider, multi: true },
        { provide: SettingsTabProvider, useClass: CommandCompletionSettingsTabProvider, multi: true },
        { provide: TerminalDecorator, useClass: CommandCompletionDecorator, multi: true },
    ],
    declarations: [
        CommandCompletionSettingsTabComponent,
    ],
    entryComponents: [
        CommandCompletionSettingsTabComponent,
    ],
})
export default class CommandCompletionModule { }

export * from './config'
export * from './historyStore'
