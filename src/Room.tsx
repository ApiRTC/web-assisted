import { useCallback, useEffect, useState } from "react";

import { isMobile } from 'react-device-detect';

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import { Theme, useThemeProps } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

import { Conversation, Stream } from "@apirtc/apirtc";
import {
    Grid as ApiRtcGrid,
    Audio,
    AudioEnableButton,
    MuteButton,
    Stream as StreamComponent,
    Video,
    VideoEnableButton
} from '@apirtc/mui-react-lib';

import { VIDEO_ROUNDED_CORNERS } from "./constants";

declare var apiRTC: any;

const video_sizing = { height: '100%', width: '100%' };

const getName = (stream: Stream) => {
    const firstName = stream.getContact()?.getUserData().get('firstName');
    const lastName = stream.getContact()?.getUserData().get('lastName');
    if (!firstName && !lastName) {
        return stream.isScreensharing() ? 'screen' : undefined;
    }
    return `${firstName ? firstName : ''} ${lastName ? lastName : ''}${stream.isScreensharing() ? '-screen' : ''}`;
};

export type RoomProps = {
    conversation: Conversation | undefined,
    facingMode: ConstrainDOMString | undefined,
    localStream: Stream | undefined,
    publishedStreams: Stream[],
    subscribedStreams: Stream[],
};
const COMPONENT_NAME = 'Room';
function Room(inProps: RoomProps) {
    const props = useThemeProps({ props: inProps, name: COMPONENT_NAME });
    const { conversation,
        facingMode, localStream,
        publishedStreams, subscribedStreams
    } = props;

    const isSmallScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down("xs"));

    const [selectedStream, setSelectedStream] = useState<Stream>();

    useEffect(() => {
        if (conversation) {
            const on_pointerSharingEnabled = (data: any) => {
                if (globalThis.logLevel.isDebugEnabled) {
                    console.debug(`${COMPONENT_NAME}|pointerSharingEnabled`, data)
                }
            };
            conversation.on('pointerSharingEnabled', on_pointerSharingEnabled);

            const on_pointerLocationChanged = (event: any) => {
                if (globalThis.logLevel.isDebugEnabled) {
                    console.debug(`${COMPONENT_NAME}|pointerLocationChanged`, event)
                }
                setPointer((pointer: Object) => { return { ...pointer, [event.source.contactId]: event.data } });
                setTimeout(() => {
                    setPointer((pointer: any) => {
                        delete pointer[event.source.contactId];
                        return { pointer };
                    });
                }, 3000);
            };
            conversation.on('pointerLocationChanged', on_pointerLocationChanged)

            conversation.enablePointerSharing(true)

            return () => {
                conversation.removeListener('pointerSharingEnabled', on_pointerSharingEnabled)
                conversation.removeListener('pointerLocationChanged', on_pointerLocationChanged)
            };
        }
    }, [conversation])

    // force selectedStream logic
    useEffect(() => {
        const screenShared = subscribedStreams.find((stream) => stream.isScreensharing());
        if (screenShared) {
            if (globalThis.logLevel.isDebugEnabled) {
                console.debug(`${COMPONENT_NAME}|useEffect setSelectedStream screenShared`, screenShared)
            }
            setSelectedStream(screenShared ? screenShared : undefined)
            return
        }

        if (isMobile && (facingMode === 'environment')) {
            if (globalThis.logLevel.isDebugEnabled) {
                console.debug(`${COMPONENT_NAME}|useEffect setSelectedStream localStream`, localStream)
            }
            setSelectedStream(localStream)
            return
        }
        if (subscribedStreams.length === 0) {
            if (globalThis.logLevel.isDebugEnabled) {
                console.debug(`${COMPONENT_NAME}|useEffect setSelectedStream localStream`, localStream)
            }
            setSelectedStream(localStream)
        } else {
            if (globalThis.logLevel.isDebugEnabled) {
                console.debug(`${COMPONENT_NAME}|useEffect setSelectedStream undefined`)
            }
            setSelectedStream(undefined)
        }
    }, [localStream, subscribedStreams, facingMode]);

    const onStreamMouseDown = useCallback((stream: Stream, event: React.MouseEvent) => {
        if (globalThis.logLevel.isDebugEnabled) {
            console.debug(`${COMPONENT_NAME}|onStreamMouseDown`, stream.getId(), event)
        }
        // x and y are useless, make it 0, 0 to enforce this
        if (conversation) {
            conversation.sendPointerLocation({
                streamId: stream.getId(),
                contactId: stream.getContact() ? stream.getContact().getId() : apiRTC.userAgentInstance.userId
            }, 0, 0, {
                top: `${Math.round(event.nativeEvent.offsetY * 100 / (event.nativeEvent.target as HTMLVideoElement).offsetHeight)}%`,
                left: `${Math.round(event.nativeEvent.offsetX * 100 / (event.nativeEvent.target as HTMLVideoElement).offsetWidth)}%`
            })
        }
    }, [conversation]);

    const [pointer, setPointer] = useState<any>({});

    const _subscribedStream = (stream: Stream, index: number, controlsSize: 'small' | 'medium' | 'large') => <StreamComponent
        id={`subscribed-stream-${index}`}
        key={index}
        sx={{
            ...(stream.hasVideo() ? video_sizing : { backgroundColor: 'grey' }),
        }}
        stream={stream}
        name={getName(stream)}
        controls={<>
            {stream.hasAudio() && <MuteButton size={controlsSize} />}
            {!stream.isScreensharing() && <AudioEnableButton size={controlsSize} disabled={true} />}
            {stream.hasVideo() && !stream.isScreensharing() && <VideoEnableButton size={controlsSize} disabled={true} />}
        </>}
        onClick={() => setSelectedStream((current) => current === stream ? undefined : stream)}>
        {stream.hasVideo() ? <Video
            sx={video_sizing}
            style={{
                ...video_sizing,
                objectFit: stream.isScreensharing() ? 'contain' : (pointer[stream.getContact().getId()] ? 'fill' : 'cover'),
                ...VIDEO_ROUNDED_CORNERS,
            }}
            pointer={pointer[stream.getContact().getId()]}
            onMouseDown={(event: React.MouseEvent) => {
                onStreamMouseDown(stream, event)
            }}
        /> : <Audio />}
    </StreamComponent>;

    const _publishedStream = (stream: Stream, index: number, controlsSize: 'small' | 'medium' | 'large') => <StreamComponent
        id={`published-stream-${index}`}
        key={index}
        sx={{
            ...(stream.hasVideo() ? video_sizing : { backgroundColor: 'grey' }),
        }}
        stream={stream}
        muted={true}
        controls={<>
            {!stream.isScreensharing() && <AudioEnableButton size={controlsSize} />}
            {stream.hasVideo() && !stream.isScreensharing() && <VideoEnableButton size={controlsSize} />}
        </>}
        onClick={() => setSelectedStream((current) => current === stream ? undefined : stream)}>
        {stream.hasVideo() ? <Video
            sx={video_sizing}
            style={{
                ...video_sizing,
                objectFit: pointer[apiRTC.userAgentInstance.userId] ? 'fill' : 'cover', //or (session as any).user.userId
                ...VIDEO_ROUNDED_CORNERS,
            }}
            pointer={pointer[apiRTC.userAgentInstance.userId]}
            onMouseDown={(event: React.MouseEvent) => {
                onStreamMouseDown(stream, event)
            }}
        /> : <Audio />}
    </StreamComponent>;

    const pubsubStreamsSize = publishedStreams.length + subscribedStreams.length;
    const nbAbsoluteStreams = selectedStream ? pubsubStreamsSize - 1 : publishedStreams.length;
    const absoluteControlsSize = nbAbsoluteStreams > 1 && isSmallScreen ? 'small' : 'medium';

    return <Box
        sx={{
            position: 'relative',
            height: '99vh', // to prevent vertical scrollbar on Chrome
            // maxHeight: '-webkit-fill-available',
            width: '100vw',
            maxWidth: '100%', // to prevent horizontal scrollbar on Chrome
        }}>
        <ApiRtcGrid sx={{ height: '100%', width: '100%' }}>
            {selectedStream ?
                // display selected stream alone
                (selectedStream.isRemote ? _subscribedStream(selectedStream, 0, 'large') : _publishedStream(selectedStream, 0, 'large'))
                :
                // display all subscribed streams
                subscribedStreams.map((stream: Stream, index: number) => _subscribedStream(stream, index, subscribedStreams.length > 1 && isSmallScreen ? 'medium' : 'large'))}
        </ApiRtcGrid>
        <Stack direction='row'
            sx={{
                position: 'absolute',
                bottom: 4,
                left: 4,
                opacity: 0.9,
                height: { xs: '20%', sm: '32%', md: '32%', lg: '32%' },
                // { xs: '60%', sm: '70%', md: '80%', lg: '100%' }
                width: { xs: `${Math.min(nbAbsoluteStreams * 32, 80)}%`, sm: `${Math.min(nbAbsoluteStreams * 20, 80)}%` }
            }}
        >
            {selectedStream ?
                // display both published and subscribed streams except the selected one
                subscribedStreams.filter(stream => stream !== selectedStream).map((stream: Stream, index: number) => _subscribedStream(stream, index, absoluteControlsSize))
                    .concat(publishedStreams.filter(stream => stream !== selectedStream).map((stream: Stream, index: number) => _publishedStream(stream, index, absoluteControlsSize)))
                :
                // display all published
                publishedStreams.map((stream, index) => (_publishedStream(stream, index, absoluteControlsSize)))}
        </Stack>
    </Box>;
}

export default Room;