'use client';
import { useEffect } from 'react';
import { useAuth } from '@/state/authStore';
import { useGame } from '@/state/gameStore';
import { useRoom } from '@/state/roomStore';
import { useSettings } from '@/state/settingsStore';
import { useT } from '@/hooks/useT';
import { useIsTouch } from '@/hooks/useDevice';
import { useRequireAuth, useRoomRedirect } from '@/hooks/useRoute';
import { bridge } from '@/game/bridge';
import { lockLandscape } from '@/services/orientation';
import { GameCanvas } from '@/components/game/GameCanvas';
import { ActionButtons, SpectatorBar, TaskPanel, TopCenter, TopRight } from '@/components/game/Hud';
import { Joystick } from '@/components/game/Joystick';
import { TaskModal } from '@/components/game/TaskModal';
import { CameraPanel, GameMenu, InfectionOverlay, MapOverlay, ReportSplash, RoleReveal, RotateDevice, SabotageMenu } from '@/components/game/Overlays';
import { MeetingScreen, VoteResultView } from '@/components/game/Meeting';
import { GameOver } from '@/components/game/GameOver';
import { KillScene } from '@/components/game/KillScene';
import { MonsoonBackdrop } from '@/components/ui/Backdrop';
import { Spinner } from '@/components/ui/Controls';

export default function PlayPage() {
  const ready = useRequireAuth();
  useRoomRedirect('play');
  const t = useT();
  const uid = useAuth((s) => s.user?.uid);
  const hasState = useGame((s) => !!s.state);
  const phase = useGame((s) => s.state?.phase);
  const panel = useGame((s) => s.panel);
  const joystickSide = useSettings((s) => s.joystickSide);
  const touch = useIsTouch();

  useEffect(() => {
    void lockLandscape();
    return () => bridge.resetInput();
  }, []);

  useEffect(() => {
    if (panel && panel.kind !== 'map') bridge.resetInput();
  }, [panel]);

  if (!ready || !uid) return null;
  if (!hasState) {
    const mapId = useRoom.getState().room?.settings.mapId ?? 'kadalimukku_old_town';
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3">
        <MonsoonBackdrop />
        <Spinner />
        <span className="text-mist">{t(`map.${mapId}`)}</span>
        <GameOver />
      </main>
    );
  }

  const showJoystick = touch && phase === 'PLAYING' && (!panel || panel.kind === 'map');

  return (
    <main className="fixed inset-0 overflow-hidden bg-ink select-none">
      <GameCanvas selfId={uid} />

      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between pt-safe pb-safe pl-safe pr-safe">
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
          <div className="justify-self-start">{phase === 'PLAYING' && <TaskPanel />}</div>
          <TopCenter />
          <div className="justify-self-end">
            <TopRight />
          </div>
        </div>
        <div className="flex items-end justify-between gap-2">
          <div className={joystickSide === 'right' ? 'order-3' : ''} />
          <div className="flex-1 self-end pb-1">
            <div className="flex justify-center">{phase === 'PLAYING' && <SpectatorBar />}</div>
          </div>
          <div className={joystickSide === 'right' ? 'order-first' : ''}>
            <ActionButtons />
          </div>
        </div>
      </div>

      {showJoystick && <Joystick side={joystickSide} />}

      <TaskModal />
      <SabotageMenu />
      <MapOverlay />
      <CameraPanel />
      <InfectionOverlay />
      <KillScene selfId={uid} />
      <GameMenu />
      <RoleReveal />
      <ReportSplash />
      <MeetingScreen />
      <VoteResultView />
      <GameOver />
      <RotateDevice />
    </main>
  );
}
