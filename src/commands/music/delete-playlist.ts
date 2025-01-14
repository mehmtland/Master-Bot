import Member from '../../lib/models/Member';
import { ApplyOptions } from '@sapphire/decorators';
import {
  ApplicationCommandRegistry,
  Command,
  CommandOptions
} from '@sapphire/framework';
import type { CommandInteraction, GuildMember } from 'discord.js';

@ApplyOptions<CommandOptions>({
  name: 'delete-playlist',
  description: 'Delete a playlist from your saved playlists',
  preconditions: ['userInDB', 'playlistExists']
})
export class DeletePlaylistCommand extends Command {
  public override async chatInputRun(interaction: CommandInteraction) {
    const playlistName = interaction.options.getString('playlist-name', true);

    const interactionMember = interaction.member as GuildMember;

    try {
      await Member.updateOne(
        {
          memberId: interactionMember.id
        },
        { $pull: { savedPlaylists: { name: playlistName } } }
      );

      return interaction.reply(`Deleted **${playlistName}**`);
    } catch (error) {
      console.error(error);
      return interaction.reply('Something went wrong! Please try again later');
    }
  }

  public override registerApplicationCommands(
    registery: ApplicationCommandRegistry
  ): void {
    registery.registerChatInputCommand({
      name: this.name,
      description: this.description,
      options: [
        {
          name: 'playlist-name',
          description: 'What is the name of the playlist you want to delete?',
          type: 'STRING',
          required: true
        }
      ]
    });
  }
}
