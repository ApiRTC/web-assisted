import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import { isMobile } from 'react-device-detect';

import { UAParser } from 'ua-parser-js';

import { decode as base64_decode } from 'base-64';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Step from '@mui/material/Step';
import { useThemeProps } from '@mui/material/styles';

import { Contact, Stream, UserAgent, UserData } from '@apirtc/apirtc'; //INVITATION_STATUS_ENDED
import { setLogLevel as setApiRtcMuiReactLibLogLevel, useToggle } from '@apirtc/mui-react-lib';
import {
	Credentials,
	setLogLevel as setApiRtcReactLibLogLevel,
	useCameraStream, useConversation, useConversationStreams,
	useSession, useUserMediaDevices
} from '@apirtc/react-lib';

import { InvitationData } from '@apirtc/shared-types';

import LogRocket from 'logrocket';

import ErrorPage from './components/Error/ErrorPage';
import OptInList from './components/Optin/OptInList';
import Settings from './components/Settings/Settings';
import TextStepper from './components/TextStepper/TextStepper';
import Room from './Room';

//import Keycloak from 'keycloak-js';
import './App.css';
import APZ_LOGO from './assets/apizee.svg';
import { loginKeyCloakJS } from './auth/keycloak';
import { LogLevelText, setLogLevel } from './logLevel';
import { setFavIcon } from '.';

// type TakeSnapshot = { takeSnapshot: Object };
// function isInstanceOfTakeSnapshot(object: any): object is TakeSnapshot {
// 	if (typeof object !== 'object') return false;
// 	return 'takeSnapshot' in object;
// }

//type FACING_MODES = 'user' | 'environment';
type SwitchFacingMode = { switchFacingMode: boolean };
function isInstanceOfSwitchFacingMode(object: any): object is SwitchFacingMode {
	if (typeof object !== 'object') return false;
	return 'switchFacingMode' in object;
}

type FileShared = { fileShared: { link: string; jwt: string } };
function isInstanceOfFileShared(object: any): object is FileShared {
	if (typeof object !== 'object') return false;
	return 'fileShared' in object;
}

type HangUp = { hangUp: boolean };
function isInstanceOfHangup(object: any): object is HangUp {
	if (typeof object !== 'object') return false;
	return 'hangUp' in object;
}

enum RequestParameters {
	invitationId = 'i',
	invitationServiceUrl = 'iU',
	logLevel = 'lL',
	logRocketAppID = 'lRAppID'
}

export type AppProps = {
	acceptTitleText?: string;
	optInCGUPrefixText?: string;
	optInCGULinkText?: string;
	optInCGUAriaLabel?: string;
	optInPrivacyPrefixText?: string;
	optInPrivacyLinkText?: string;
	optInPrivacyAriaLabel?: string;
	optInButtonText?: string;
	hangedUpText?: string;
};
const COMPONENT_NAME = 'App';
function App(inProps: AppProps) {
	const props = useThemeProps({ props: inProps, name: COMPONENT_NAME });
	const {
		optInCGUPrefixText = 'I agree to the ',
		optInCGULinkText = 'General Terms of Sale',
		optInCGUAriaLabel = 'accept-terms-conditions',
		optInPrivacyPrefixText = 'I agree to the ',
		optInPrivacyLinkText = 'Privacy Policy',
		optInPrivacyAriaLabel = 'accept-privacy-policy',
		optInButtonText = 'Confirm',
		hangedUpText = 'The agent hanged up. Bye!',
	} = props;

	const params = useParams();
	const [searchParams] = useSearchParams();

	const logLevel = useMemo(() => {
		return searchParams.get(RequestParameters.logLevel) as LogLevelText ?? globalThis.logLevel.level;
	}, [searchParams]);

	useEffect(() => {
		setLogLevel(logLevel)
		setApiRtcReactLibLogLevel(logLevel)
		setApiRtcMuiReactLibLogLevel(logLevel)
		// ApiRTC log level can be set at ApiRTC platform level, per apiKey.
		// Shall we set it here too ?
		//apiRTC.setLogLevel(10)
	}, [logLevel])

	const logRocketAppID = useMemo(() => {
		return searchParams.get(RequestParameters.logRocketAppID);
	}, [searchParams]);

	useEffect(() => {
		// setup logRocket
		if (logRocketAppID && logRocketAppID !== '') {
			if (globalThis.logLevel.isDebugEnabled) {
				console.debug(`${COMPONENT_NAME}|logRocket init`, logRocketAppID)
			}
			LogRocket.init(logRocketAppID)
		}
	}, [logRocketAppID])

	const invitationServiceUrl = useMemo(() => {
		return searchParams.get(RequestParameters.invitationServiceUrl) ?? 'https://is.apizee.com/invitations';
	}, [searchParams]);

	const [invitationData, setInvitationData] = useState<InvitationData | undefined>(undefined);
	const [invitationError, setInvitationError] = useState<boolean>(false);
	const [invitationErrorStatus, setInvitationErrorStatus] = useState<number | undefined>(
		undefined
	);

	const [facingMode, setFacingMode] = useState<ConstrainDOMString | undefined>();

	const [streamAudioEnabled, setStreamAudioEnabled] = useState<boolean | undefined>(undefined);
	const [streamVideoEnabled, setStreamVideoEnabled] = useState<boolean | undefined>(undefined);

	// stepper
	const [activeStep, setActiveStep] = useState(0);
	const handleNext = () => {
		setActiveStep((prevActiveStep) => prevActiveStep + 1);
	};
	const handleBack = () => {
		setActiveStep((prevActiveStep) => prevActiveStep - 1);
	};

	// opt-in
	const optInAccepted = useMemo(() => activeStep >= 1, [activeStep]);

	const { value: ready, toggle: toggleReady } = useToggle(false);

	const [imgSrc, setImgSrc] = useState<string>();

	const [hangedUp, setHangedUp] = useState<boolean>(false);

	// ApiRTC hooks
	//
	const credentials = useMemo(() =>
		invitationData ? ({ apiKey: invitationData.apiKey } as Credentials) : undefined,
		[invitationData]);

	const registerInformation = useMemo(() =>
		invitationData ? {
			cloudUrl: invitationData.cloudUrl
				? invitationData.cloudUrl
				: 'https://cloud.apirtc.com',
			// SpecifyThis : The customer-side app shall join the <sessionId>-guests group
			// this will allow to share customer side specific info with userData for example
			groups: [`${invitationData.conversation.name}-guests`],
			userData: new UserData({
				firstName: invitationData.user.firstName,
				lastName: invitationData.user.lastName,
			}),
		} : undefined,
		[invitationData]);

	const { session, disconnect } = useSession(credentials, registerInformation);

	const {
		userMediaDevices,
		selectedAudioIn, selectedAudioInId, setSelectedAudioIn,
		selectedVideoIn, selectedVideoInId, setSelectedVideoIn,
	} = useUserMediaDevices(session, isMobile ? undefined : 'apirtc-web-guest');

	const userMediaStreamRequest = useMemo(() => invitationData ?
		invitationData.streams.find((obj) => { return (obj.type === 'user-media') }) : undefined,
		[invitationData]);

	const displayMediaStreamRequest = useMemo(() => !isMobile && invitationData ?
		invitationData.streams.find((obj) => { return (obj.type === 'display-media') }) : undefined,
		[invitationData]);

	useEffect(() => {
		if (session && invitationData) {
			// enable callStatsMonitoring for support
			session.getUserAgent().enableCallStatsMonitoring(invitationData.callStatsMonitoringInterval !== undefined,
				{ interval: invitationData.callStatsMonitoringInterval })
		}
	}, [session, invitationData])

	useEffect(() => {
		if (invitationData && invitationData.logo) {
			setFavIcon(invitationData.logo.url)
		}
	}, [invitationData])

	// set facingMode according to invitation
	useEffect(() => {
		if (userMediaStreamRequest) {
			const audioMediaTrackConstraints = userMediaStreamRequest.constraints?.audio;
			const videoMediaTrackConstraints = userMediaStreamRequest.constraints?.video;

			setStreamAudioEnabled(Boolean(audioMediaTrackConstraints))
			setStreamVideoEnabled(Boolean(videoMediaTrackConstraints))

			if (videoMediaTrackConstraints instanceof Object) {
				if (globalThis.logLevel.isDebugEnabled) {
					console.debug(`${COMPONENT_NAME}|useEffect invitationData has video constraints`, videoMediaTrackConstraints)
				}
				if (videoMediaTrackConstraints.facingMode) {
					setFacingMode(videoMediaTrackConstraints.facingMode)
				}
			}
		}
	}, [userMediaStreamRequest])

	const createStreamOptions = useMemo(() => {
		const new_constraints = { ...userMediaStreamRequest?.constraints };

		if (new_constraints?.audio && (streamAudioEnabled === undefined || streamAudioEnabled)) {
			const audioMediaTrackConstraints =
				new_constraints.audio instanceof Object ? { ...new_constraints.audio } : {};
			if (selectedAudioInId) {
				audioMediaTrackConstraints.deviceId = selectedAudioInId;
			}
			new_constraints.audio = audioMediaTrackConstraints;
		} else {
			new_constraints.audio = false;
		}

		if (new_constraints?.video && (streamVideoEnabled === undefined || streamVideoEnabled)) {
			const videoMediaTrackConstraints =
				new_constraints.video instanceof Object ? { ...new_constraints.video } : {};

			if (isMobile && facingMode) {
				videoMediaTrackConstraints.facingMode = facingMode;
				delete videoMediaTrackConstraints.deviceId;
			} else if (selectedVideoInId) {
				videoMediaTrackConstraints.deviceId = selectedVideoInId;
				// Do not leave a facingMode set if a deviceId was selected.
				delete videoMediaTrackConstraints.facingMode;
			}
			new_constraints.video = videoMediaTrackConstraints;
		} else {
			new_constraints.video = false;
		}

		if (globalThis.logLevel.isDebugEnabled) {
			console.debug(`${COMPONENT_NAME}|useMemo new_constraints`, new_constraints)
		}

		return { constraints: new_constraints };
	}, [
		userMediaStreamRequest,
		selectedAudioInId, selectedVideoInId,
		facingMode,
		streamAudioEnabled, streamVideoEnabled,
	]);

	const { stream: localStream, grabbing, error: cameraError } = useCameraStream(
		optInAccepted && userMediaStreamRequest ? session : undefined,
		createStreamOptions);

	// getCapabilities does not work on firefox
	// useEffect(() => {
	// 	if (localStream) {
	// 		console.log("getCapabilities", localStream, localStream.getCapabilities())
	// 	}
	// }, [localStream])

	const [screenShareStream, setScreenShareStream] = useState<Stream>();

	const { conversation } = useConversation(
		session,
		invitationData ? invitationData.conversation.name : undefined,
		invitationData ? invitationData.conversation.getOrCreateOptions : undefined,
		true,
		invitationData ? invitationData.conversation.joinOptions : undefined
	);

	const streamsToPublish = useMemo(() => [
		...(localStream && ready ? [{ stream: localStream, options: userMediaStreamRequest?.publishOptions }] : []),
		...(screenShareStream ? [{ stream: screenShareStream }] : [])],
		[ready, localStream, userMediaStreamRequest, screenShareStream]);

	const { publishedStreams, subscribedStreams } = useConversationStreams(conversation, streamsToPublish);

	const doSendData = useCallback((data: any) => {
		if (conversation) {
			conversation.sendData(data).then(() => {
				if (globalThis.logLevel.isDebugEnabled) {
					console.log(`${COMPONENT_NAME}|conversation sendData`, data)
				}
			}).catch((error: any) => {
				if (globalThis.logLevel.isWarnEnabled) {
					console.warn(`${COMPONENT_NAME}|conversation sendData error`, error)
				}
			})
		}
	}, [conversation]);

	// For testing purpose
	// const [localStreams, setLocalStreams] = useState<Stream[]>(localStream ? [localStream] : []);
	// const more = () => {
	//   if (localStream) {
	//     localStreams.push(localStream)
	//     setLocalStreams(Array.from(localStreams))
	//   }
	// };
	// const less = () => {
	//   localStreams.pop()
	//   setLocalStreams(Array.from(localStreams))
	// };
	// const subscribedStreams = useMemo(() => [...t_subscribedStreams, ...localStreams], [t_subscribedStreams, localStreams]);

	const getInvitationData = async (invitationId: string, token?: string) => {
		return fetch(`${invitationServiceUrl}/${invitationId}`, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			}
		}).then((response) => {
			if (response.status !== 200) {
				return null;
			}
			return response.json();
		}).catch((error) => {
			console.error(`${COMPONENT_NAME}|getInvitationData`, error)
		});
	};

	useEffect(() => {
		const handleTabClose = (event: BeforeUnloadEvent) => {
			//event.preventDefault()
			setInvitationData(undefined)
			return undefined;
		};
		window.addEventListener('beforeunload', handleTabClose)
		return () => {
			window.removeEventListener('beforeunload', handleTabClose)
		};
	}, [])

	useEffect(() => {
		const i: string | null = searchParams.get(RequestParameters.invitationId);
		if (i) {
			try {
				const l_data: InvitationData = JSON.parse(base64_decode(i)) as InvitationData;
				if (globalThis.logLevel.isDebugEnabled) {
					console.debug(`${COMPONENT_NAME}|InvitationData`, JSON.stringify(l_data))
				}
				setInvitationData(l_data);
			} catch (error) {
				if (error instanceof SyntaxError) {
					getInvitationData(i).then((body) => {
						if (globalThis.logLevel.isInfoEnabled) {
							console.info(`${COMPONENT_NAME}|getInvitationData`, i, body)
						}
						setInvitationData(body.data)
					})
					return
				} else {
					console.error(`${COMPONENT_NAME}|parsing i search parameter error`, error)
					setInvitationError(true)
				}
			}
		}
	}, [searchParams])

	useEffect(() => {
		if (params.invitationData) {
			try {
				const l_data: InvitationData = JSON.parse(base64_decode(params.invitationData)) as InvitationData;
				if (globalThis.logLevel.isDebugEnabled) {
					console.debug(`${COMPONENT_NAME}|InvitationData`, JSON.stringify(l_data))
				}
				setInvitationData(l_data)
			} catch (error) {
				if (error instanceof SyntaxError) {
					const invitationId = params.invitationData;
					loginKeyCloakJS().then((keycloak) => {
						if (globalThis.logLevel.isDebugEnabled) {
							console.debug(`${COMPONENT_NAME}|keycloak.token`, keycloak.token)
						}
						getInvitationData(invitationId).then((data) => {
							if (globalThis.logLevel.isDebugEnabled) {
								console.debug(`${COMPONENT_NAME}|getInvitationData`, invitationId, data)
							}
							setInvitationData(data)
						});
					}).catch((error: any) => {
						console.error(`${COMPONENT_NAME}|loginKeyCloakJS error`, error)
					})
				}
			}
		}
	}, [params.invitationData])

	useEffect(() => {
		if (invitationData && session) {
			if (globalThis.logLevel.isDebugEnabled) {
				console.debug(`${COMPONENT_NAME}|logRocket identify`, invitationData.conversation.name, session.getId())
			}
			LogRocket.identify(`${invitationData.conversation.name}-${session.getId()}`)
		}
	}, [invitationData, session])

	useEffect(() => {
		if (session) {
			const userAgent: UserAgent = session.getUserAgent();
			const parser = new UAParser();
			if (globalThis.logLevel.isDebugEnabled) {
				console.debug(`${COMPONENT_NAME}|UAParser`, parser.getResult())
			}
			const userData: UserData = userAgent.getUserData();
			userData.setToSession()
			userData.setProp('systemInfo', JSON.stringify(parser.getResult()))
			// TODO : I was forced to call setUserData again to make it work : check why and how
			// could the api be enhanced regarding userData usage (setToSession is also a pain)
			userAgent.setUserData(userData)
		}
	}, [session])

	useEffect(() => {
		if (session && localStream) {
			// To receive data from contacts
			const onContactData = (contactDataInfo: any) => {
				if (globalThis.logLevel.isDebugEnabled) {
					console.debug(`${COMPONENT_NAME}|onContactData`, contactDataInfo)
				}
				// const sender: Contact = contactDataInfo.sender;
				const content: Object = contactDataInfo.content;
				// if (isInstanceOfTakeSnapshot(content)) {
				// 	localStream.takeSnapshot(content.takeSnapshot)
				// 		.then((snapshot: any) => {
				// 			if (globalThis.logLevel.isDebugEnabled) {
				// 				console.debug(`${COMPONENT_NAME}|takeSnapshot of`, localStream, snapshot)
				// 			}
				// 			const fileTransferInvitation = sender.sendFile(
				// 				{
				// 					name: `snapshot_${new Date().toISOString()}.png`,
				// 					type: 'image/png',
				// 				}, snapshot
				// 			);
				// 			fileTransferInvitation.on('statusChange', (statusChangeInfo: any) => {
				// 				if (globalThis.logLevel.isDebugEnabled) {
				// 					console.debug(`${COMPONENT_NAME}|statusChange`, statusChangeInfo)
				// 				}
				// 			});
				// 		}).catch((error: any) => {
				// 			if (globalThis.logLevel.isWarnEnabled) {
				// 				console.warn(`${COMPONENT_NAME}|takeSnapshot error`, error)
				// 			}
				// 		});
				// } else 
				if (isInstanceOfSwitchFacingMode(content)) {
					if (globalThis.logLevel.isDebugEnabled) {
						console.debug(`${COMPONENT_NAME}|SwitchFacingMode`)
					}
					setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))
				}
			};
			session.on('contactData', onContactData)
			return () => {
				session.removeListener('contactData', onContactData)
			};
		}
	}, [session, localStream])

	useEffect(() => {
		if (conversation) {
			// To receive data from contacts
			const onData = (dataInfo: any) => {
				if (globalThis.logLevel.isDebugEnabled) {
					console.debug(`${COMPONENT_NAME}|Conversation onData`, dataInfo)
				}
				const content: Object = dataInfo.content;
				if (isInstanceOfFileShared(content)) {
					if (globalThis.logLevel.isDebugEnabled) {
						console.debug(`${COMPONENT_NAME}|fileShared`, content)
					}
					fetch(content.fileShared.link, {
						method: 'get',
						mode: 'cors',
						headers: new Headers({
							Authorization: `Bearer ${content.fileShared.jwt}`
						}),
					}).then((res) => {
						return res.blob();
					}).then((blob) => {
						const url = window.URL.createObjectURL(blob);
						setImgSrc(url)
					}).catch((error) => {
						console.error(`${COMPONENT_NAME}|fetch error`, content.fileShared.link, error)
					});
				} else if (isInstanceOfHangup(content)) {
					if (globalThis.logLevel.isDebugEnabled) {
						console.debug(`${COMPONENT_NAME}|received Hangup, leaving conversation`, content)
					}
					conversation.leave().then()
						.catch((error) => {
							if (globalThis.logLevel.isWarnEnabled) {
								console.warn(`${COMPONENT_NAME}|conversation leave error`, error)
							}
						}).finally(() => {
							disconnect()
						});
					setHangedUp(true)
				}
			};
			conversation.on('data', onData)
			return () => {
				conversation.removeListener('data', onData)
			};
		}
	}, [conversation, disconnect])

	useEffect(() => {
		if (screenShareStream) {
			screenShareStream.on('stopped', () => {
				if (globalThis.logLevel.isInfoEnabled) {
					console.log(`${COMPONENT_NAME}|The user has ended sharing the screen`);
				}
				setScreenShareStream(undefined)
			});
			return () => {
				screenShareStream.release()
			}
		}
	}, [screenShareStream])

	useEffect(() => {
		if (optInAccepted) {
			doSendData({
				type: 'timeline-event',
				event: 'opt-in-accepted'
			})
		}
	}, [doSendData, optInAccepted])

	useEffect(() => {
		if (localStream) {
			doSendData({
				type: 'timeline-event',
				event: 'camera-stream-grabbed'
			})
		}
	}, [doSendData, localStream])

	useEffect(() => {
		if (ready) {
			doSendData({
				type: 'timeline-event',
				event: 'enter-room'
			})
		}
	}, [doSendData, ready])

	const optIns = [
		{
			id: 'CGU',
			labels: {
				aria: optInCGUAriaLabel,
				prefix: optInCGUPrefixText,
				link: optInCGULinkText,
			},
			link: navigator.language === 'fr' || navigator.language === 'fr-FR'
				? 'https://cloud.apizee.com/attachments/b87662d7-3e82-4519-a4db-9fb6ba67b5cc/Apizee-ConditionsGeneralesUtilisation.pdf'
				: 'https://cloud.apizee.com/attachments/cb744e03-182b-453e-bbdf-0d89cf42e182/Apizee-TermsOfUse.pdf',
		},
		{
			id: 'Privacy',
			labels: {
				aria: optInPrivacyAriaLabel,
				prefix: optInPrivacyPrefixText,
				link: optInPrivacyLinkText,
			},
			link: navigator.language === 'fr' || navigator.language === 'fr-FR'
				? 'https://cloud.apizee.com/attachments/f87493b0-483e-4723-a3ee-02d59a501b1c/Apizee-PolitiqueConfidentialite.pdf'
				: 'https://cloud.apizee.com/attachments/ae61f778-16d1-4dd4-baa1-cd1ba568a0d6/Apizee-PrivacyPolicy.pdf',
		}
	];

	return <>
		{!session && !invitationError && <Box display="flex" alignItems="center" justifyContent="center" sx={{ mt: 5 }}>
			<img height="320px" width="320px" src={invitationData?.logo?.url || APZ_LOGO} alt={invitationData?.logo?.alt || 'Apizee'} />
		</Box>}

		{invitationError && <ErrorPage errorType={invitationErrorStatus}></ErrorPage>}
		{session && !invitationError && !ready && <Container maxWidth="sm" sx={{ height: '100vh' }}>
			<Box
				sx={{ height: '100%' }}
				display="flex"
				alignItems="center"
				justifyContent="center">
				<Card>
					<CardContent>
						<TextStepper
							activeStep={activeStep}
							header={<img src={invitationData?.logo?.url || APZ_LOGO} alt={invitationData?.logo?.alt || 'Apizee'} height={24} />}>
							<Step key="legal">
								<OptInList
									optIns={optIns}
									labels={{ submit: optInButtonText }}
									onSubmit={handleNext}
								/>
							</Step>
							<Step key="device-selection">
								<Settings
									userMediaStreamRequest={userMediaStreamRequest} displayMediaStreamRequest={displayMediaStreamRequest}
									userMediaDevices={userMediaDevices}
									selectedAudioIn={selectedAudioIn} setSelectedAudioIn={setSelectedAudioIn}
									selectedVideoIn={selectedVideoIn} setSelectedVideoIn={setSelectedVideoIn}
									createStreamOptions={createStreamOptions} grabbing={grabbing} localStream={localStream}
									cameraError={cameraError}
									streamAudioEnabled={streamAudioEnabled} setStreamAudioEnabled={setStreamAudioEnabled}
									streamVideoEnabled={streamVideoEnabled} setStreamVideoEnabled={setStreamVideoEnabled}
									screenShareStream={screenShareStream} setScreenShareStream={setScreenShareStream}
									handleBack={handleBack} toggleReady={toggleReady}></Settings>
							</Step>
						</TextStepper>
					</CardContent>
				</Card>
			</Box>
		</Container>}
		{conversation && ready && <Room conversation={conversation}
			facingMode={facingMode} localStream={localStream}
			publishedStreams={publishedStreams} subscribedStreams={subscribedStreams}></Room>}
		{/* <Button onClick={more}>+</Button><Button onClick={less}>-</Button> */}
		{imgSrc && <img src={imgSrc} alt="sharedImg"></img>}
		{hangedUp && <Container maxWidth="md">
			<Alert severity="info">{hangedUpText}</Alert>
		</Container>}
	</>;
}

export default App;


// Keycloak
// const keycloak = new Keycloak({
//   url: 'https://idp.apizee.com/auth', realm: 'APIZEE-POC-DGPN', clientId: 'visio-assisted'
// })
//const keycloak = new Keycloak(window.location.origin + '/web-guest/keycloak.json');
// console.log(window.location.origin + '/web-guest/silent-check-sso.html')

// useEffect(() => {
//   keycloak.init({
//     //onLoad: 'login-required', // Loops on refreshes
//     // onLoad: 'check-sso', // does not seem to change anything
//     // silentCheckSsoRedirectUri: window.location.origin + '/web-guest/silent-check-sso.html',
//     //silentCheckSsoFallback: false
//   }).then((auth) => {
//     console.log("Keycloak.init", auth)
//     if (!auth) {
//       console.log("Keycloak NOT authenticated...")
//     } else {
//       console.log("Keycloak authenticated", auth, keycloak.token)
//     }
//   }).catch((error: any) => {
//     console.error('keycloak.init', error)
//   });
// }, [])

// {session &&
//       <div>
//         <p>{session.getUserAgent().getUserData().get('systemInfo')}</p>
//       </div>}
// <Button variant="contained" onClick={(e: React.SyntheticEvent) => {
//     e.preventDefault();
//     keycloak.login().then(
//       (auth: any) => {
//         console.log("Keycloak.login", auth)
//         alert("auth" + JSON.stringify(auth))
//         if (!auth) {
//           console.log("Keycloak NOT authenticated...")
//         } else {
//           console.log("Keycloak authenticated", auth)
//         }
//       }
//     )
//   }}>Login with Keycloak</Button>
// CANT make a call from button, because this is not called back when redirected...
// {invitationData &&
//     <Typography align='center' variant='h2'>Hello {invitationData.user.firstName}</Typography>
//   }
// <Grid container spacing={0}
//     direction="column"
//     alignItems="center"
//     justifyContent="center">
//     <Grid item xs={3}>
//       {invitationData ?
//         <>
//           <div>
//             {invitationData.conversation.friendlyName && <span>Conversation {invitationData.conversation.friendlyName}</span>}
//           </div>
//         </> : <div>no invitationData</div>}
//     </Grid>
//   </Grid>
