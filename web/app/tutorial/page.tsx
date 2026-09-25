'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/state/authStore';
import { useGame } from '@/state/gameStore';
import { useRoom } from '@/state/roomStore';
import { useSettings } from '@/state/settingsStore';
import { useIsTouch } from '@/hooks/useDevice';
import { useRequireAuth } from '@/hooks/useRoute';
import { bridge } from '@/game/bridge';
import { lockLandscape } from '@/services/orientation';
import { markOnboarding } from '@/services/profile';
import { GameCanvas } from '@/components/game/GameCanvas';
import { ActionButtons, TaskPanel, TopCenter, TopRight } from '@/components/game/Hud';
import { Joystick } from '@/components/game/Joystick';
import { TaskModal } from '@/components/game/TaskModal';
import { MapOverlay, ReportSplash, RoleReveal, RotateDevice } from '@/components/game/Overlays';
import { MeetingScreen, VoteResultView } from '@/components/game/Meeting';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { TutorialDirector } from '@/components/tutorial/director';
import { TutorialOverlay } from '@/components/tutorial/TutorialOverlay';

/**
 * Interactive tutorial: the real town and HUD, offline, with a guided script.
 * First-time players go on to character setup; replays return to Story.
 */
export default function TutorialPage() {
  const ready = useRequireAuth();
  const router = useRouter();
  const uid = useAuth((s) => s.user?.uid);
  const profile = useAuth((s) => s.profile);
  const inRoom = useRoom((s) => !!s.room);
  const hasState = useGame((s) => !!s.state);
  const phase = useGame((s) => s.state?.phase);
  const panel = useGame((s) => s.panel);
  const joystickSide = useSettings((s) => s.joystickSide);
  const touch = useIsTouch();
  const [firstRun, setFirstRun] = useState<boolean | null>(null);
  const [run, setRun] = useState(0);
  const [director, setDirector] = useState<TutorialDirector | null>(null);
  // Read at start only: saving onboarding progress updates the profile mid-run.
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const profileReady = !!profile;

  useEffect(() => {
    if (profile && firstRun === null) setFirstRun(!profile.onboarding.hasCompletedTutorial);
  }, [profile, firstRun]);

  // Never run offline over a live room; Home routes back to the lobby / match.
  useEffect(() => {
    if (inRoom) router.replace('/home');
  }, [inRoom, router]);

  useEffect(() => {
    void lockLandscape();
    return () => bridge.resetInput();
  }, []);

  useEffect(() => {
    const p = profileRef.current;
    if (!uid || !profileReady || !p || inRoom) return;
    const d = new TutorialDirector({ id: uid, name: p.username, appearance: p.appearance });
    d.start();
    setDirector(d);
    return () => {
      d.stop();
      setDirector(null);
    };
  }, [run, uid, profileReady, inRoom]);

  useEffect(() => {
    if (panel && panel.kind !== 'map') bridge.resetInput();
  }, [panel]);

  const leave = useCallback(() => {
    if (firstRun) {
      void markOnboarding({ hasCompletedTutorial: true });
      router.replace('/setup');
    } else {
      router.replace('/story');
    }
  }, [firstRun, router]);

  const restart = useCallback(() => setRun((r) => r + 1), []);

  if (!ready || !uid || firstRun === null || !director || !hasState) return <LoadingScreen messageKey="loading.profile" />;

  const showJoystick = touch && phase === 'PLAYING' && (!panel || panel.kind === 'map');

  return (
    <main className="fixed inset-0 overflow-hidden bg-ink select-none">
      <GameCanvas key={run} selfId={uid} />

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
          <div className="flex-1" />
          <div className={joystickSide === 'right' ? 'order-first' : ''}>
            <ActionButtons />
          </div>
        </div>
      </div>

      {showJoystick && <Joystick side={joystickSide} />}

      <TaskModal />
      <MapOverlay />
      <RoleReveal />
      <ReportSplash />
      <MeetingScreen />
      <VoteResultView />
      <TutorialOverlay director={director} onFinish={leave} onSkip={leave} onRestart={restart} exitLabel={firstRun ? 'tut.skip' : 'tut.exit'} />
      <RotateDevice />
    </main>
  );
}
