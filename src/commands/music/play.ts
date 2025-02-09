import { ApplyOptions } from '@sapphire/decorators';
import {
  ApplicationCommandRegistry,
  Command,
  CommandOptions
} from '@sapphire/framework';
import type { CommandInteraction, GuildMember } from 'discord.js';
import { container } from '@sapphire/framework';
import type { MessageChannel } from '../..';
import searchSong from '../../lib/utils/music/searchSong';
import Member from '../../lib/models/Member';
import type { SavedPlaylist } from './create-playlist';
import type { Addable } from '../../lib/utils/queue/Queue';
//import Member from '../../lib/models/Member';

@ApplyOptions<CommandOptions>({
  name: 'play',
  description: 'Play any song or playlist from YouTube and Spotify!',
  preconditions: [
    'inVoiceChannel',
    'musicTriviaPlaying',
    'inPlayerVoiceChannel',
    'userInDB'
  ]
})
export class PlayCommand extends Command {
  public override async chatInputRun(interaction: CommandInteraction) {
    await interaction.deferReply();
    //const interactionMember = interaction.member as GuildMember;
    const { client } = container;
    const query = interaction.options.getString('query', true);
    const isCustomPlaylist =
      interaction.options.getString('is-custom-playlist');

    const interactionMember = interaction.member as GuildMember;

    // had a precondition make sure the user is infact in a voice channel
    const voiceChannel = interaction.guild?.voiceStates?.cache?.get(
      interaction.user.id
    )?.channel;

    let tracks: Addable[] = [];
    let message: string = '';
    if (isCustomPlaylist == 'Yes') {
      const member = await Member.findOne({
        memberId: interactionMember.id
      });

      const savedPlaylists: SavedPlaylist[] = member.savedPlaylists;

      const index = savedPlaylists.findIndex(element => element.name === query);
      if (index !== -1) {
        const urls = savedPlaylists[index].urls;

        for (let i = 0; i < urls.length; i++) {
          const track = await searchSong(urls[i].url as string);
          if (!track[1].length) continue;

          tracks.push(...track[1]);
        }

        message = `Added tracks from **${query}** to the queue!`;
      } else {
        return await interaction.followUp({
          content: `You have no custom playlist named **${query}**!`,
          ephemeral: true
        });
      }
    } else {
      const trackTuple = await searchSong(query);
      if (!trackTuple[1].length) {
        return await interaction.followUp({ content: trackTuple[0] as string }); // error
      }
      message = trackTuple[0];
      tracks.push(...trackTuple[1]);
    }

    let player = client.music.players.get(interaction.guild!.id);

    if (!player?.connected) {
      player ??= client.music.createPlayer(interaction.guild!.id);
      player.queue.channel = interaction.channel as MessageChannel;
      await player.connect(voiceChannel!.id, { deafened: true });
    }

    const started = player.playing || player.paused;

    await interaction.followUp({ content: message });
    player.queue.add(tracks, { requester: interaction.user.id });
    if (!started) {
      await player.queue.start();
    }
    return;
  }

  public override registerApplicationCommands(
    registery: ApplicationCommandRegistry
  ): void {
    registery.registerChatInputCommand({
      name: this.name,
      description: this.description,
      options: [
        {
          name: 'query',
          description: 'What song or playlist would you like to listen to?',
          type: 'STRING',
          required: true
        },
        {
          name: 'is-custom-playlist',
          description: 'Is it a custom playlist?',
          type: 'STRING',
          choices: [
            {
              name: 'Yes',
              value: 'Yes'
            },
            {
              name: 'No',
              value: 'No'
            }
          ]
        }
      ]
    });
  }
}
