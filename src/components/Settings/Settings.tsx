import { useDeferredValue, useMemo } from "react";

import Alert from '@mui/material/Alert';
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Icon from "@mui/material/Icon";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

import { CreateStreamOptions, MediaDevice, MediaDeviceList, Stream } from '@apirtc/apirtc';
import {
    Audio,
    AudioEnableButton,
    MediaDeviceSelect,
    Stream as StreamComponent,
    Video,
    VideoEnableButton
} from '@apirtc/mui-react-lib';

import { useThemeProps } from "@mui/material/styles";
import { VIDEO_ROUNDED_CORNERS } from "../../constants";

export type SettingsProps = {
    userMediaStreamRequest: any, displayMediaStreamRequest: any,
    userMediaDevices: MediaDeviceList,
    selectedAudioIn: MediaDevice | undefined, setSelectedAudioIn: Function,
    selectedVideoIn: MediaDevice | undefined, setSelectedVideoIn: Function,
    createStreamOptions: CreateStreamOptions,
    grabbing: boolean,
    localStream: Stream | undefined,
    cameraError: any,
    streamAudioEnabled: boolean | undefined, setStreamAudioEnabled: Function,
    streamVideoEnabled: boolean | undefined, setStreamVideoEnabled: Function,
    screenShareStream: Stream | undefined, setScreenShareStream: Function,
    handleBack: () => void, toggleReady: () => void,
    cameraErrorText?: string,
    backButtonText?: string,
    readyButtonText?: string,
    selectAtLeastOneMediaText?: string,
    selectDeviceHelperText?: string
    shareScreenText?: string
};
const COMPONENT_NAME = 'Settings';
const Settings: React.FC<SettingsProps> = (inProps: SettingsProps) => {

    const props = useThemeProps({ props: inProps, name: COMPONENT_NAME });
    const {
        userMediaStreamRequest, displayMediaStreamRequest,
        userMediaDevices,
        selectedAudioIn, setSelectedAudioIn,
        selectedVideoIn, setSelectedVideoIn,
        createStreamOptions, grabbing, localStream,
        cameraError,
        streamAudioEnabled, setStreamAudioEnabled,
        streamVideoEnabled, setStreamVideoEnabled,
        screenShareStream, setScreenShareStream,
        handleBack, toggleReady,
        backButtonText = 'Back',
        selectAtLeastOneMediaText = 'Please select at least one media',
        cameraErrorText = 'Please check a device is available and not already grabbed by another software.',
        readyButtonText = 'Enter',
        selectDeviceHelperText = 'Please check what you want to share before entering the room.',
        shareScreenText = 'Please click here to share your screen'
    } = props;

    const shareScreen = () => {
        if (globalThis.logLevel.isDebugEnabled) {
            console.debug(`${COMPONENT_NAME}|shareScreen calls createDisplayMediaStream`)
        }
        Stream.createDisplayMediaStream({}, false).then((localStream: Stream) => {
            if (globalThis.logLevel.isInfoEnabled) {
                console.info(`${COMPONENT_NAME}|createDisplayMediaStream`, localStream)
            }
            setScreenShareStream(localStream)
        }).catch((error: any) => {
            console.error(`${COMPONENT_NAME}|createDisplayMediaStream error`, error)
        })
    };

    const _settingsErrors = useMemo(() => [
        ...(userMediaStreamRequest && !streamAudioEnabled && !streamVideoEnabled) ? [selectAtLeastOneMediaText] : [],
        ...((streamAudioEnabled || streamVideoEnabled) && cameraError ? [cameraErrorText] : []),
        ...(createStreamOptions.constraints?.audio && !grabbing && localStream && !localStream.hasAudio() ? ["Failed to grab audio"] : []),
        ...(createStreamOptions.constraints?.video && !grabbing && localStream && !localStream.hasVideo() ? ["Failed to grab video: Please check a device is available and not already grabbed by another software"] : [])
    ], [localStream, grabbing, cameraError, createStreamOptions]);

    // Kind of debounce the settingsErrors_ to prevent BadgeError to show
    // between withAudio/Video toggle and grabbing
    const settingsErrors = useDeferredValue(_settingsErrors);

    return <Stack direction='column' spacing={1}>
        {userMediaStreamRequest &&
            <Stack
                sx={{ mt: 1 }}
                direction={{ xs: 'column' }}
                alignItems="center"
                justifyContent="center"
                useFlexGap
                flexWrap="wrap"
                spacing={1}>
                <Box
                    sx={{
                        width: '100%',
                        paddingTop: '75%',
                        position: 'relative',
                        '& .MuiBox-root': {
                            position: 'absolute',
                            height: '100%',
                            maxWidth: '100%',
                        },
                    }}>
                    {localStream ? (
                        <StreamComponent
                            sx={{
                                top: 0,
                                left: 0,
                                bottom: 0,
                                right: 0,
                                maxWidth: { xs: '100%', sm: '100%' },
                                ...(!localStream.hasVideo() && {
                                    position: 'absolute',
                                    inset: 0,
                                    borderRadius: '4px',
                                    backgroundColor: '#CACCCE',
                                }),
                            }}
                            stream={localStream}
                            muted={true}
                            controls={<>
                                {localStream.hasAudio() && <AudioEnableButton />}
                                {localStream.hasVideo() && <VideoEnableButton />}
                            </>}>
                            {localStream.hasVideo() ? (
                                <Video
                                    style={{
                                        height: '100%',
                                        ...VIDEO_ROUNDED_CORNERS,
                                    }}
                                    data-testid={`local-video`}
                                />
                            ) : (
                                <Audio data-testid={`local-audio`} />
                            )}
                        </StreamComponent>
                    ) : (
                        <Skeleton
                            variant="rectangular"
                            width="100%"
                            height="100%"
                            sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                            }}
                        />
                    )}
                </Box>
                <Box
                    sx={{
                        minWidth: '120px',
                        width: '100%',
                        display: 'flex',
                    }}>
                    <Button
                        sx={{
                            minWidth: 0,
                            width: '3em',
                            height: '3em',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            border: 'solid 1px rgba(0, 0, 0, 0.23)',
                            borderRadius: '4px',
                            boxSizing: 'border-box',
                            flexShrink: 0,
                            color: 'black',
                        }}
                        disabled={
                            !userMediaStreamRequest.constraints
                                ?.audio
                        }
                        onClick={() =>
                            setStreamAudioEnabled(!streamAudioEnabled)
                        }>
                        <Icon>
                            {createStreamOptions.constraints?.audio ? 'mic_on' : 'mic_off'}
                        </Icon>
                    </Button>
                    <MediaDeviceSelect
                        sx={{
                            marginLeft: '0.25em',
                            minWidth: '120px',
                            flexGrow: '1',
                        }}
                        id="audio-in"
                        size="small"
                        disabled={!createStreamOptions.constraints?.audio}
                        devices={userMediaDevices.audioinput}
                        selectedDevice={selectedAudioIn}
                        setSelectedDevice={setSelectedAudioIn}
                    />
                </Box>
                <Box
                    sx={{
                        minWidth: '120px',
                        width: '100%',
                        display: 'flex',
                    }}>
                    <Button
                        sx={{
                            minWidth: 0,
                            width: '3em',
                            height: '3em',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            border: 'solid 1px rgba(0, 0, 0, 0.23)',
                            borderRadius: '4px',
                            boxSizing: 'border-box',
                            flexShrink: 0,
                            color: 'black',
                        }}
                        disabled={
                            !userMediaStreamRequest.constraints
                                ?.video
                        }
                        onClick={() => {
                            setStreamVideoEnabled(!streamVideoEnabled);
                        }}>
                        <Icon>
                            {createStreamOptions.constraints?.video
                                ? 'videocam_on'
                                : 'videocam_off'}
                        </Icon>
                    </Button>

                    <MediaDeviceSelect
                        sx={{
                            marginLeft: '0.25em',
                            minWidth: '120px',
                            flexGrow: '1',
                        }}
                        id="video-in"
                        size="small"
                        disabled={!createStreamOptions.constraints?.video}
                        devices={userMediaDevices.videoinput}
                        selectedDevice={selectedVideoIn}
                        setSelectedDevice={setSelectedVideoIn}
                    />
                </Box>
            </Stack>}
        {displayMediaStreamRequest &&
            <Stack mt={1} alignItems="center" spacing={1}>
                {screenShareStream && <Video
                    style={{
                        display: 'flex',
                        maxWidth: '100%',
                        ...VIDEO_ROUNDED_CORNERS,
                    }}
                    data-testid={`screen-share-video`}
                    stream={screenShareStream}
                />}
                {!screenShareStream && <Button variant='outlined' color='primary'
                    onClick={shareScreen}>{shareScreenText}</Button>}
            </Stack>}
        {settingsErrors.length !== 0 &&
            <Stack direction="column"
                justifyContent="center" alignItems="center"
                spacing={1}>
                {
                    settingsErrors.map((entry, index) =>
                        <Alert key={index} variant='outlined' severity='error'>{entry}</Alert>)
                }
            </Stack>
        }
        <Alert sx={{ mt: 1 }} severity="info">{selectDeviceHelperText}</Alert>
        <Box sx={{ display: 'flex', justifyContent: 'end', mt: 1 }}>
            <Button onClick={handleBack}>{backButtonText}</Button>
            <Button variant="outlined"
                disabled={(settingsErrors.length !== 0)
                    || (displayMediaStreamRequest && !screenShareStream)
                    || (userMediaStreamRequest && !localStream)} //(!streamAudioEnabled && !streamVideoEnabled)
                onClick={toggleReady}>
                {readyButtonText}
            </Button>
        </Box>
    </Stack>;
};

export default Settings;