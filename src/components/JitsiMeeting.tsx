import React, { useEffect, useRef } from 'react';

declare global {
    interface Window {
        JitsiMeetExternalAPI: any;
    }
}

interface JitsiMeetingProps {
    roomId: string;
    currentUser: any;
    onExit: () => void;
}

export default function JitsiMeeting({ roomId, currentUser, onExit }: JitsiMeetingProps) {
    const jitsiContainerRef = useRef<HTMLDivElement>(null);
    const apiRef = useRef<any>(null);

    useEffect(() => {
        if (!jitsiContainerRef.current) return;

        const loadJitsi = () => {
            if (window.JitsiMeetExternalAPI) {
                const domain = "meet.jit.si";
                // Ensure roomName is safe and somewhat unique
                const roomName = `AgenciaCRM-${roomId.replace(/\s+/g, '-')}`;
                
                const options = {
                    roomName: roomName,
                    width: "100%",
                    height: "100%",
                    parentNode: jitsiContainerRef.current,
                    lang: 'pt-br',
                    configOverwrite: {
                        startWithAudioMuted: true,
                        disableThirdPartyRequests: true,
                        prejoinPageEnabled: false
                    },
                    interfaceConfigOverwrite: {
                        TOOLBAR_BUTTONS: [
                            'microphone', 'camera', 'closedcaptions', 'desktop', 
                            'fullscreen', 'fodeviceselection', 'hangup', 'profile', 
                            'chat', 'recording', 'livestreaming', 'etherpad', 
                            'sharedvideo', 'settings', 'raisehand', 'videoquality', 
                            'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts', 
                            'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone'
                        ],
                        SHOW_JITSI_WATERMARK: false,
                        DEFAULT_REMOTE_DISPLAY_NAME: 'Cliente'
                    },
                    userInfo: {
                        displayName: currentUser?.name || 'Participante (Agência)'
                    }
                };

                apiRef.current = new window.JitsiMeetExternalAPI(domain, options);

                apiRef.current.addEventListener('videoConferenceLeft', () => {
                        onExit();
                });
            } else {
                // Retry if not loaded
                setTimeout(loadJitsi, 500);
            }
        };

        loadJitsi();

        return () => {
            if (apiRef.current) {
                apiRef.current.dispose();
            }
        };
    }, [roomId, currentUser, onExit]);

    return <div id="reuniao-container" ref={jitsiContainerRef} className="w-full h-screen" />;
}
