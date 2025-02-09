import { load } from '@lavaclient/spotify';
import {
  ApplicationCommandRegistries,
  RegisterBehavior
} from '@sapphire/framework';
import type { NewsChannel, TextChannel, ThreadChannel } from 'discord.js';
import { Player } from 'lavaclient';
import * as data from './config.json';
import { Queue } from './lib/utils/queue/Queue';
import type { Song } from './lib/utils/queue/Song';
import { TriviaQueue } from './lib/utils/trivia/TriviaQueue';
import { ExtendedClient } from './structures/ExtendedClient';
import mongoose from 'mongoose';

load({
  client: {
    id: data.spotify_client_id,
    secret: data.spotify_client_secret
  },
  autoResolveYoutubeTracks: true
});

const client = new ExtendedClient();

client.on('ready', async () => {
  try {
    await mongoose.connect(encodeURI(data.mongo_URI));
    console.log('mongo is ready');
  } catch (err) {
    console.error(err);
    console.error('Failed to connect to mongoDB');
  }
  client.music.connect(client.user!.id);
  client.user?.setActivity('/', {
    type: 'WATCHING'
  });
  client.user?.setStatus('online');
});

export type MessageChannel = TextChannel | ThreadChannel | NewsChannel | null;

declare module 'lavaclient' {
  interface Player {
    readonly queue: Queue;
    readonly triviaQueue: TriviaQueue;
    [_queue]: Queue;
    [_triviaQueue]: TriviaQueue;
    nightcore: boolean;
    vaporwave: boolean;
    karaoke: boolean;
    bassboost: boolean;
  }

  interface ClusterEvents {
    nodeQueueCreate: (node: ClusterNode, queue: Queue) => void;
    nodeQueueFinish: (node: ClusterNode, queue: Queue) => void;
    nodeTrackStart: (node: ClusterNode, queue: Queue, song: Song) => void;
    nodeTrackEnd: (node: ClusterNode, queue: Queue, song: Song) => void;
  }

  interface NodeEvents {
    queueCreate: (queue: Queue) => void;
    queueFinish: (queue: Queue) => void;
    trackStart: (queue: Queue, song: Song) => void;
    trackEnd: (queue: Queue, song: Song) => void;
  }
}

const _queue: unique symbol = Symbol.for('Player#queue');
const _triviaQueue: unique symbol = Symbol.for('Player#triviaQueue');
Reflect.defineProperty(Player.prototype, 'queue', {
  get(this: Player) {
    return (this[_queue] ??= new Queue(this));
  }
});
Reflect.defineProperty(Player.prototype, 'triviaQueue', {
  get(this: Player) {
    return (this[_triviaQueue] ??= new TriviaQueue(this));
  }
});

ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(
  RegisterBehavior.Overwrite
);

client.login(data.token);
