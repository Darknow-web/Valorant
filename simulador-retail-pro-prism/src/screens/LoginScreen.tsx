import React from 'react';
import { PrismHeader } from '../components/prism/PrismHeader';
import { PrismLogo } from '../components/ui/PrismLogo';
import { Interactive } from '../components/ui/Interactive';
import { useSimulator } from '../store/SimulatorContext';

export const LoginScreen = () => {
  const { appState, setAppState, handleInteract } = useSimulator();

  return (
    <div className="w-full min-h-full flex flex-col items-center pt-[10vh] bg-[#222222]">
      <div className="w-[850px] flex flex-col overflow-hidden border border-[#555] rounded-[1px] shadow-2xl">
        <PrismHeader title="Retail Pro Prism" className="py-1" />

        <div className="bg-white pl-4 pr-12 py-8 flex items-center">
          <div className="w-[30%] flex justify-start items-center">
             <PrismLogo className="w-[180px] object-contain" />
          </div>

          <div className="w-[70%] flex flex-col gap-3 pl-6">
            <div className="flex flex-col gap-1">
              <label className="text-[#333] font-bold text-[12px]">Usuario</label>
              <Interactive id="login-input-user">
                <input
                  type="text"
                  value={appState.user || ''}
                  placeholder="Nombre de Usuario"
                  onChange={(e) => {
                    const val = e.target.value;
                    setAppState({ user: val });
                    handleInteract('login-input-user', val);
                  }}
                  onBlur={(e) => handleInteract('login-input-user', e.target.value, true)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleInteract('login-input-user', e.currentTarget.value, true); }}
                  className="w-full border border-[#bbb] rounded-[2px] px-2 py-1.5 text-[13px] text-[#333] placeholder:text-[#999] focus:outline-none focus:border-[#66afe9] shadow-inner"
                />
              </Interactive>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[#333] font-bold text-[12px]">Contraseña</label>
              <Interactive id="login-input-password">
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={appState.password || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAppState({ password: val });
                    handleInteract('login-input-password', val);
                  }}
                  onBlur={(e) => handleInteract('login-input-password', e.target.value, true)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleInteract('login-input-password', e.currentTarget.value, true); }}
                  className="w-full border border-[#bbb] rounded-[2px] px-2 py-1.5 text-[13px] text-[#333] placeholder:text-[#999] focus:outline-none focus:border-[#66afe9] shadow-inner"
                />
              </Interactive>
            </div>

            <Interactive id="login-btn-submit">
              <button
                type="button"
                className="mt-1 w-full rounded-[3px] bg-gradient-to-b from-[#8c8c8c] via-[#666666] to-[#4a4a4a] border border-[#333] py-2 text-white text-[14px] shadow-sm hover:from-[#9a9a9a] hover:via-[#777777] hover:to-[#555555] transition-colors"
              >
                Iniciar Sesión
              </button>
            </Interactive>
          </div>
        </div>

        {/* Footer Info */}
        <div className="bg-[#cccccc] px-5 py-4 text-[#555] text-[11px] leading-[1.6] border-t border-[#aaa]">
          <p className="mb-2"><span className="font-bold text-[#333]">Servidor</span> 10.0.1.102</p>
          <p>
            © 2010 - 2023 Retail Pro International LLC
            <br />
            Licensed to Mascotas Latinas until 2026-10-31
          </p>
        </div>
      </div>
    </div>
  );
};
