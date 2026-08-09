import React from 'react';
import { PrismHeader, PrismFooter } from '../components/ui/PrismUI';
import { Interactive } from '../components/ui/Interactive';
import { useSimulator } from '../store/SimulatorContext';

export const PaymentScreen = () => {
  const { appState, setAppState, handleInteract, catalog } = useSimulator();
  const [openDropdown, setOpenDropdown] = React.useState<string | null>(null);

  const totalDoc = appState.cart.reduce((sum, item) => sum + item.price, 0);
  const totalPaid = appState.payments.reduce((sum, p) => sum + p.amount, 0);
  const pending = (totalDoc - totalPaid).toFixed(2);
  const vuelto = (totalPaid - totalDoc > 0.01 && totalDoc > 0) ? (totalPaid - totalDoc).toFixed(2) : (totalDoc < 0 ? Math.abs(totalDoc).toFixed(2) : '0.00');
  const paymentMethods = ['Efectivo', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Crédito de Tienda'];
  // Las marcas de tarjeta salen del catálogo del entrenador: antes estaba fija
  // en 'Visa', así que si él cambiaba la marca esperada era imposible elegirla.
  const cardTypes = catalog.cardTypes;
  
  /**
   * Quita un pago de la lista y DEVUELVE lo que consumió.
   *
   * Aplicar un pago con crédito de tienda descuenta el saldo disponible. El
   * botón «Anular» solo quitaba el pago y no reponía nada, así que anularlo
   * evaporaba el crédito: como el producto nuevo cuesta más que la nota de
   * crédito, el total ya no se podía cubrir, «Imprimir Actualizar» no aparecía
   * nunca y el Módulo 11 quedaba muerto. Deshacer tiene que deshacerlo todo.
   */
  const anularPago = (pago: any) => {
    const esCreditoDeTienda = String(pago?.method || '').startsWith('Crédito de Tienda');
    setAppState({
      payments: appState.payments.filter((otro) => otro !== pago),
      storeCredit: esCreditoDeTienda
        ? appState.storeCredit + Math.abs(Number(pago?.amount) || 0)
        : appState.storeCredit,
    });
  };

  const showVuelto = (totalPaid - totalDoc > 0.01 && totalDoc > 0);
  const isComplete = totalDoc < 0 
    ? (appState.vueltoGiven || totalPaid <= totalDoc + 0.01) 
    : (totalPaid >= totalDoc && (!showVuelto || appState.vueltoGiven));

  return (
    <div className="w-full h-full flex flex-col bg-white">
      {/* Top Black Logo Bar */}
      <div className="h-[32px] px-2 flex items-center bg-[#222222] shrink-0 border-b border-[#111]">
        <img src="https://firebasestorage.googleapis.com/v0/b/simulador-retail-pro.firebasestorage.app/o/Modulo%203%20ventana%20de%20venta%2FLogo%20con%20p%20blanca.png?alt=media" alt="Retail Pro Logo" className="h-[22px] object-contain ml-1" />
      </div>
      <PrismHeader title="Pagar Transacción" />
      {appState.showStoreCreditModal && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-start pt-[10vh] justify-center">
          <div className="bg-white w-[500px] shadow-[0_0_20px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden border border-[#333]">
             <div className="bg-[#0f3b6c] text-white px-4 py-2 text-[15px] font-bold">
               Crédito de Tienda
             </div>
             <div className="p-4 bg-white flex flex-col space-y-4">
                <div className="text-[13px] text-[#333]">Crédito de tienda del cliente disponible.</div>
                <div className="text-[13px] text-[#333]">Este cliente tiene <span className="font-bold">S/.{appState.storeCredit.toFixed(2)}</span> disponible.<br/>¿Desean usarlo ahora?</div>
             </div>
             <div className="px-4 pb-4 flex justify-end space-x-2">
                <Interactive id="modal-store-credit-yes">
                  <button onClick={() => {
                      setAppState({ 
                         showStoreCreditModal: false, 
                         selectedPaymentMethod: 'Crédito de Tienda'
                      });
                      handleInteract('modal-store-credit-yes');
                  }} className="bg-gradient-to-b from-[#333] to-[#111] hover:from-[#444] hover:to-[#222] text-white px-4 py-1.5 border border-black rounded-[5px] shadow-sm text-[12px] font-bold">Sí</button>
                </Interactive>
                <button onClick={() => {
                   setAppState({ showStoreCreditModal: false });
                   handleInteract('pos-btn-pay');
                }} className="bg-gradient-to-b from-[#333] to-[#111] hover:from-[#444] hover:to-[#222] text-white px-4 py-1.5 border border-black rounded-[5px] shadow-sm text-[12px] font-bold">No</button>
             </div>
          </div>
        </div>
      )}
      {appState.showNCTransferenciaModal && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-start pt-[10vh] justify-center">
          <div className="bg-[#e6e6e6] w-[500px] shadow-[0_0_20px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden border border-[#333]">
             <div className="bg-[#0f3b6c] text-white px-4 py-2 text-[15px] font-bold">
               NC devolución con transferencia bancaria
             </div>
             <div className="p-2 flex flex-col space-y-2">
                <div className="border border-[#a0a0a0] bg-white text-black">
                  <div className="bg-[#0f3b6c] text-white px-2 py-1 font-bold text-[12px]">Datos Bancarios</div>
                  <div className="p-2 text-[12px] flex flex-col space-y-1 border-b border-[#a0a0a0]">
                    <div className="flex">
                      <div className="w-[150px] font-bold">Nombre</div>
                      <div>Jeanette Angulo</div>
                    </div>
                    <div className="flex">
                      <div className="w-[150px] font-bold">Rut</div>
                      <div>10284768</div>
                    </div>
                  </div>
                  <div className="p-2 flex flex-col space-y-2 text-[12px]">
                    <div className="flex items-center">
                      <div className="w-[150px] font-bold">Banco</div>
                      <select className="flex-1 border border-gray-400 p-0.5 outline-none bg-white text-black">
                        <option>Seleccione Banco...</option>
                        <option>BCP</option>
                        <option>BBVA</option>
                        <option>Interbank</option>
                        <option>Scotiabank</option>
                      </select>
                    </div>
                    <div className="flex items-center">
                      <div className="w-[150px] font-bold">Tipo de cuenta</div>
                      <select className="flex-1 border border-gray-400 p-0.5 outline-none bg-white text-black">
                        <option>Seleccione Tipo...</option>
                        <option>Ahorros</option>
                        <option>Corriente</option>
                      </select>
                    </div>
                    <div className="flex items-start">
                      <div className="w-[150px] font-bold mt-1">N° de cuenta</div>
                      <div className="flex-1 flex flex-col">
                        <input type="text" className="w-full border border-gray-400 p-0.5 outline-none text-black" placeholder="Ingrese número de cuenta" />
                      </div>
                    </div>
                  </div>
                  <div className="h-6 bg-[#0f3b6c]"></div>
                </div>
             </div>
             <div className="px-2 pb-2 flex justify-end space-x-2">
                <Interactive id="modal-nctransf-ok">
                  <button onClick={() => {
                      const amount = Number(pending);
                      setAppState({ 
                         showNCTransferenciaModal: false, 
                         selectedPaymentMethod: 'Efectivo',
                         payments: [...appState.payments, { method: 'NCTRANSF\nNo Autorización 0000', amount }]
                      });
                      handleInteract('modal-nctransf-ok');
                  }} className="bg-gradient-to-b from-[#7a7a7a] to-[#5a5a5a] text-white px-4 py-1 border border-gray-400 font-bold shadow-sm flex items-center"><span className="mr-1">✔</span>ACEPTAR</button>
                </Interactive>
                <button onClick={() => setAppState({ showNCTransferenciaModal: false, selectedPaymentMethod: 'Efectivo' })} className="bg-gradient-to-b from-[#edae4e] to-[#d69534] text-white px-4 py-1 border border-orange-700 font-bold shadow-sm">Cancelar</button>
             </div>
          </div>
        </div>
      )}
      {appState.showAuthModal && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-start pt-[10vh] justify-center">
          <div className="bg-white w-[400px] rounded-sm shadow-[0_0_20px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden border border-[#333]">
             <div className="bg-gradient-to-b from-[#1b4b7a] to-[#0f2c4a] text-white px-4 py-2.5 text-[15px] font-sans shadow-sm font-bold">
               Ingrese código de autorización
             </div>
             <div className="p-4 bg-white flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-[12px] font-bold text-[#333] w-[120px]">Código de autorización</span>
                  <input type="text" value={appState.authCode || ''} onChange={(e) => setAppState({ authCode: e.target.value })} className="flex-1 border border-red-500 p-1 focus:outline-none text-[13px] text-black" />
                </div>
                {!appState.authCode && <div className="text-red-500 text-[11px] ml-[128px] bg-red-100 p-1 mt-1">El campo es requerido.</div>}
             </div>
             <div className="bg-gray-100 px-4 py-3 flex justify-end space-x-2 border-t border-gray-300">
                <button onClick={() => setAppState({ showAuthModal: false, selectedPaymentMethod: 'Efectivo' })} className="bg-gradient-to-b from-[#333] to-[#111] hover:from-[#444] hover:to-[#222] text-white px-4 py-1.5 border border-black rounded-[5px] shadow-sm text-[12px] font-bold">CANCELAR</button>
                <Interactive id="modal-auth-ok">
                  <button onClick={() => {
                      // Este onClick solo llega a ejecutarse si la validación del
                      // paso dio por bueno el código: el envoltorio `Interactive`
                      // valida antes, en la fase de captura, y corta el evento
                      // cuando el valor no corresponde.
                      if (!appState.authCode) return;

                      // El pago lo crea la PANTALLA, no el paso.
                      //
                      // Antes lo creaba la `action` de m7-s8 / m8-s8, y las
                      // acciones solo corren cuando el paso AVANZA, nunca al
                      // repetir uno ya cumplido. Por eso, si el colaborador
                      // anulaba el pago, no había forma de volver a cobrarle al
                      // agregador y el módulo quedaba muerto. Aquí, repetir el
                      // paso lo vuelve a crear.
                      //
                      // Y la forma de pago vuelve a Efectivo porque los botones
                      // RAPPI y PEDIDOS YA solo se dibujan con Efectivo
                      // seleccionado: dejándola en 'RAPPI' desaparecían de la
                      // pantalla para siempre. Es lo mismo que ya hace el
                      // ACEPTAR de la ventana de NC Transferencia.
                      const metodo = appState.selectedPaymentMethod;
                      const amount = Number(appState.takeAmount || pending);
                      setAppState({
                         showAuthModal: false,
                         authCode: '',
                         selectedPaymentMethod: 'Efectivo',
                         payments: [...appState.payments, { method: metodo, amount }],
                      });
                  }} className="bg-gradient-to-b from-[#666] to-[#444] hover:from-[#777] hover:to-[#555] text-white px-4 py-1.5 border border-black rounded-[5px] shadow-sm text-[12px] font-bold">OK</button>
                </Interactive>
             </div>
          </div>
        </div>
      )}


      <div className="flex-1 flex overflow-hidden p-2 space-x-2">
        {/* Left Column */}
        <div className="flex-1 flex flex-col space-y-2">
           <div className={`border p-2 text-[13px] ${Number(pending) > 0 ? 'border-gray-300 text-[#e74c3c]' : (Number(pending) < 0 ? 'border-gray-300 text-green-600 bg-gray-50' : 'border-gray-300 text-gray-400 bg-gray-50')}`}>
              {Number(pending) < 0 ? `Give (!) Por Pagar S/.${Math.abs(Number(pending)).toFixed(2)}` : `Take (!) Por Pagar S/.${pending}`}
           </div>

           <div className="border border-gray-300 shadow-sm flex flex-col">
              <div className="bg-gradient-to-b from-[#14355c] to-[#0c2440] border-b border-[#0a203a] text-white p-2 flex justify-between items-center shadow-inner">
                 <span className="font-bold text-[14px]">{Number(pending) < 0 ? 'Give (!)' : 'Take (!)'} {appState.selectedPaymentMethod}</span>
                 {(showVuelto || Number(pending) < 0) ? (
                   <Interactive id="pay-btn-vuelto">
                     <button onClick={() => {
                        if (handleInteract('pay-btn-vuelto') === false) return;
                        const amount = Number(appState.takeAmount || pending);
                        if (appState.selectedPaymentMethod === 'Crédito de Tienda') {
                           setAppState({
                              payments: [...appState.payments, { method: appState.selectedPaymentMethod, amount: -Math.abs(amount) }],
                              takeAmount: '',
                              selectedPaymentMethod: 'Efectivo'
                           });
                        } else {
                           setAppState({ vueltoGiven: true });
                        }
                     }} className="bg-gradient-to-b from-[#f5b84c] to-[#e09825] hover:from-[#fbc86c] hover:to-[#f0a835] border border-[#b87612] text-white py-1 px-5 text-[14px] font-bold shadow-sm rounded-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">Vuelto</button>
                   </Interactive>
                 ) : (
                   <Interactive id="pay-btn-apply">
                     <button onClick={() => {
                        if (handleInteract('pay-btn-apply') === false) return;
                        let amountToApply = Number(appState.takeAmount || pending);
                        if (appState.selectedPaymentMethod === 'Crédito de Tienda') {
                            amountToApply = Math.min(amountToApply, appState.storeCredit);
                        }

                        if (amountToApply !== 0) {
                           setAppState({
                              payments: [...appState.payments, { method: appState.selectedPaymentMethod, amount: amountToApply }],
                              storeCredit: appState.selectedPaymentMethod === 'Crédito de Tienda' ? appState.storeCredit - amountToApply : appState.storeCredit,
                              takeAmount: '',
                              selectedPaymentMethod: 'Efectivo',
                              cardType: '',
                              tipoProcesamiento: 'Manual',
                              e115: '',
                              noAutorizacion: '',
                              e116: ''
                           });
                        }
                     }} className="bg-gradient-to-b from-[#4fa3e8] to-[#1a6cb8] hover:from-[#5ab3f8] hover:to-[#2a7cc8] border border-[#104e8b] text-white py-1 px-5 text-[14px] font-bold shadow-sm rounded-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">Pago</button>
                   </Interactive>
                 )}
              </div>

              <div className="p-4 flex flex-col space-y-3 bg-white">
                 <div className="flex items-center">
                    <label className="w-[120px] text-[12px] font-bold text-right pr-4 text-[#333]">Metodo de Pago</label>
                    <div className="flex-1 flex relative h-[26px]">
                       <div className="flex-1 relative h-full cursor-pointer" onClick={() => setOpenDropdown(openDropdown === 'method' ? null : 'method')}>
                          <div className="w-full h-full border border-gray-300 px-2 text-[13px] bg-white text-[#333] flex items-center">{appState.selectedPaymentMethod}</div>
                          {openDropdown === 'method' && (
                             <div className="absolute top-full left-0 w-full bg-white border border-gray-300 shadow-lg z-50">
                                {paymentMethods.map(m => (
                                  <Interactive key={m} id={`pay-method-${m.replace(/ /g, '-')}`}>
                                    <div className="p-2 text-[13px] text-[#333] hover:bg-[#e6f2ff] cursor-pointer" onClick={(e) => { e.stopPropagation(); setAppState({ selectedPaymentMethod: m, takeAmount: pending, cardType: '', tipoProcesamiento: 'Manual', e115: '', e116: '', noAutorizacion: '', autorizacionForzada: false }); setOpenDropdown(null); }}>{m}</div>
                                  </Interactive>
                                ))}
                             </div>
                          )}
                       </div>
                       <button className="w-[26px] h-[26px] bg-black text-white flex items-center justify-center text-[10px]" onClick={() => setOpenDropdown(openDropdown === 'method' ? null : 'method')}>▼</button>
                    </div>
                 </div>

                 {(appState.selectedPaymentMethod === 'Tarjeta de Crédito' || appState.selectedPaymentMethod === 'Tarjeta de Débito') && (
                   <>
                     <div className="flex items-center">
                        <label className="w-[120px] text-[12px] font-bold text-right pr-4 text-[#333]">Cantidad</label>
                        <input type="text" placeholder={`S/.${pending}`} value={appState.takeAmount ? `S/.${appState.takeAmount}` : (parseFloat(pending) > 0 ? `S/.${pending}` : '')}
                           onChange={(e) => {
                              const val = e.target.value.replace('S/.', '');
                              setAppState({ takeAmount: val });
                           }}
                           onBlur={(e) => {
                              let val = e.target.value.replace('S/.', '').trim();
                              if (val && !val.includes('.')) {
                                 val += '.00';
                                 setAppState({ takeAmount: val });
                              }
                           }}
                           onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                 let val = e.currentTarget.value.replace('S/.', '').trim();
                                 if (val && !val.includes('.')) {
                                    val += '.00';
                                    setAppState({ takeAmount: val });
                                 }
                              }
                           }}
                           className="flex-1 h-[26px] border border-gray-300 px-2 text-[13px] text-right text-[#333] focus:outline-none" />
                     </div>
                     <div className="flex items-center">
                        <label className="w-[120px] text-[12px] font-bold text-right pr-4 text-[#333]">Tipo Procesamiento:</label>
                        <div className="flex-1 flex relative h-[26px]">
                           <select 
                              value={appState.tipoProcesamiento || 'Manual'} 
                              onChange={(e) => setAppState({ tipoProcesamiento: e.target.value })}
                              className="w-full h-full border border-gray-300 px-2 text-[13px] bg-white text-[#333] focus:outline-none cursor-pointer appearance-none">
                              <option value="Manual">Manual</option>
                              <option value="Integrado">Integrado</option>
                           </select>
                           <div className="absolute right-0 top-0 w-[26px] h-full flex items-center justify-center pointer-events-none text-[10px] text-gray-500">▼</div>
                        </div>
                     </div>
                     <div className="flex items-center">
                        <label className="w-[120px] text-[12px] font-bold text-right pr-4 text-[#333]">Tipo de Tarjeta</label>
                        <div className="flex-1 flex relative h-[26px]">
                           <div className="flex-1 relative h-full cursor-pointer" onClick={() => setOpenDropdown(openDropdown === 'card' ? null : 'card')}>
                              <div className="w-full h-full border border-gray-300 px-2 text-[13px] bg-white text-[#333] flex items-center">{appState.cardType || ''}</div>
                              {openDropdown === 'card' && (
                                 <div className="absolute top-full left-0 w-full bg-white border border-gray-300 shadow-lg z-50">
                                    {cardTypes.map(m => (
                                      <Interactive key={m} id={`pay-select-card-type`}>
                                        <div className="p-2 text-[13px] text-[#333] hover:bg-[#e6f2ff] cursor-pointer" onClick={(e) => { e.stopPropagation(); setAppState({ cardType: m }); setOpenDropdown(null); }}>{m}</div>
                                      </Interactive>
                                    ))}
                                 </div>
                              )}
                           </div>
                           <button className="w-[26px] h-[26px] bg-white border border-l-0 border-gray-300 text-gray-500 flex items-center justify-center text-[10px]" onClick={() => setOpenDropdown(openDropdown === 'card' ? null : 'card')}>▼</button>
                        </div>
                     </div>
                     <div className="flex items-center">
                        <label className="w-[120px] text-[12px] font-bold text-right pr-4 text-[#333]">E-115</label>
                        <Interactive id="input-e115" className="flex-1 h-[26px]">
                           <input type="text" value={appState.e115 || ''} onChange={(e) => {
                              setAppState({ e115: e.target.value });
                              handleInteract('input-e115', e.target.value, true);
                           }} className="w-full h-full border border-gray-300 px-2 text-[13px] text-[#333] focus:outline-none" />
                        </Interactive>
                     </div>
                     <div className="flex items-center">
                        <label className="w-[120px] text-[12px] font-bold text-right pr-4 text-[#333]">E-116</label>
                        <div className="flex-1 flex relative h-[26px]">
                           <select 
                              value={appState.e116 || ''} 
                              onChange={(e) => setAppState({ e116: e.target.value })}
                              className="w-full h-full border border-gray-300 px-2 text-[13px] bg-white text-[#333] focus:outline-none cursor-pointer appearance-none">
                              <option value=""></option>
                              {[1,2,3,4,5,6,7,8,9,10,11,12,18,24,36].map(n => <option key={n} value={n}>{n}</option>)}
                           </select>
                           <div className="absolute right-0 top-0 w-[26px] h-full flex items-center justify-center pointer-events-none text-[10px] text-gray-500">▼</div>
                        </div>
                     </div>
                     <div className="flex items-center">
                        <label className="w-[120px] text-[12px] font-bold text-right pr-4 text-[#333]">Autorización Forzada?</label>
                        <div className="flex-1 flex items-center">
                           <input type="checkbox" checked={appState.autorizacionForzada || false} onChange={(e) => setAppState({ autorizacionForzada: e.target.checked })} className="h-[14px] w-[14px]" />
                        </div>
                     </div>
                     <div className="flex items-center">
                        <label className="w-[120px] text-[12px] font-bold text-right pr-4 text-[#333]">No. Autorización</label>
                        <Interactive id="input-no-autorizacion" className="flex-1 h-[26px]">
                           <input type="text" value={appState.noAutorizacion || ''} onChange={(e) => {
                              setAppState({ noAutorizacion: e.target.value });
                              handleInteract('input-no-autorizacion', e.target.value, true);
                           }} className="w-full h-full border border-gray-300 px-2 text-[13px] text-[#333] focus:outline-none" />
                        </Interactive>
                     </div>
                   </>
                 )}
                 {appState.selectedPaymentMethod === 'Efectivo' && (
                   <div className="flex items-center">
                      <label className="w-[120px] text-[12px] font-bold text-right pr-4 text-[#333]">{showVuelto ? 'Give (!) Cantidad' : (Number(pending) < 0 ? 'Give (!) Cantidad' : 'Take (!) Cantidad')}</label>
                      <input type="text" placeholder={showVuelto ? `S/.${vuelto}` : `S/.${Math.abs(Number(pending)).toFixed(2)}`} value={appState.takeAmount ? `S/.${appState.takeAmount}` : (showVuelto ? `S/.${vuelto}` : '')} 
                         onChange={(e) => {
                            const val = e.target.value.replace('S/.', '');
                            setAppState({ takeAmount: val });
                         }}
                         onBlur={(e) => {
                            let val = e.target.value.replace('S/.', '').trim();
                            if (val && !val.includes('.')) {
                               val += '.00';
                               setAppState({ takeAmount: val });
                            }
                         }}
                         onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                               let val = e.currentTarget.value.replace('S/.', '').trim();
                               if (val && !val.includes('.')) {
                                  val += '.00';
                                  setAppState({ takeAmount: val });
                               }
                            }
                         }}
                         className="flex-1 h-[26px] border border-gray-300 px-2 text-[13px] text-right text-[#333] focus:outline-none" />
                   </div>
                 )}
                 {appState.selectedPaymentMethod === 'Crédito de Tienda' && (
                   <>
                     <div className="flex items-center mt-2">
                        <label className="w-[150px] text-[12px] font-bold text-right pr-4 text-[#333]">{Number(pending) < 0 ? 'Give Cantidad' : 'Take Cantidad'}</label>
                        <input type="text" placeholder={`S/.${Math.abs(Number(pending)).toFixed(2)}`} value={appState.takeAmount ? `S/.${appState.takeAmount}` : `S/.${Math.abs(Number(pending)).toFixed(2)}`} className="flex-1 border border-gray-300 px-2 text-[13px] bg-white text-right text-[#333] h-[26px] focus:outline-none" readOnly />
                     </div>
                     <div className="flex items-center mt-2">
                        <label className="w-[150px] text-[12px] font-bold text-right pr-4 text-[#333]">Nombre Cliente</label>
                        <input type="text" value={appState.currentCustomer ? appState.currentCustomer.name : 'Elba Farro'} className="flex-1 border border-gray-300 bg-[#eeeeee] px-2 text-[13px] text-[#333] h-[26px] focus:outline-none" readOnly />
                     </div>
                     <div className="flex items-center mt-2">
                        <label className="w-[150px] text-[12px] font-bold text-right pr-4 text-[#333]">Número ID del Cliente</label>
                        <input type="text" value={appState.currentCustomer ? appState.currentCustomer.doc : catalog.returnDocument.customerDoc} className="flex-1 border border-gray-300 bg-[#eeeeee] px-2 text-[13px] text-[#333] h-[26px] focus:outline-none" readOnly />
                     </div>
                     <div className="flex items-center mt-2">
                        <label className="w-[150px] text-[12px] font-bold text-right pr-4 text-[#333]">Crédito Tienda Disponible</label>
                        <input type="text" value={appState.storeCredit > 0 ? `S/.${appState.storeCredit.toFixed(2)}` : 'S/.0.00'} className="flex-1 border border-gray-300 bg-[#eeeeee] px-2 text-[13px] text-[#333] h-[26px] focus:outline-none" readOnly />
                     </div>
                   </>
                 )}
              </div>
           </div>

           {/* Quick Action Buttons */}
           {appState.selectedPaymentMethod === 'Efectivo' && (
           <div className="flex flex-col space-y-1 pt-4">
              <div className="flex space-x-1">
                 <Interactive id="pay-btn-rappi-pedidos" value="RAPPI" className="flex-1">
                     <button onClick={() => {
                        setAppState({ showAuthModal: true, selectedPaymentMethod: 'RAPPI' });
                        handleInteract('pay-btn-rappi-pedidos', 'RAPPI');
                     }} className="w-full h-full bg-gradient-to-b from-[#6c86a1] to-[#4a637d] text-white py-1.5 text-[12px] shadow-sm rounded-sm border border-[#4a637d]">RAPPI</button>
                 </Interactive>
                 <Interactive id="pay-btn-rappi-pedidos" value="PEDIDOS YA" className="flex-1">
                     <button onClick={() => {
                        setAppState({ showAuthModal: true, selectedPaymentMethod: 'PEDIDOS YA' });
                        handleInteract('pay-btn-rappi-pedidos', 'PEDIDOS YA');
                     }} className="w-full h-full bg-gradient-to-b from-[#6c86a1] to-[#4a637d] text-white py-1.5 text-[12px] shadow-sm rounded-sm border border-[#4a637d]">PEDIDOS YA</button>
                 </Interactive>
                 <button className="flex-1 bg-gradient-to-b from-[#6c86a1] to-[#4a637d] text-white py-1.5 text-[12px] shadow-sm rounded-sm border border-[#4a637d]">WEB</button>
              </div>
              <div className="flex space-x-1">
                 <button className="flex-[0.33] bg-gradient-to-b from-[#6c86a1] to-[#4a637d] text-white py-1.5 text-[12px] shadow-sm rounded-sm border border-[#4a637d] mr-[2px]">MPAGO</button>
                 <button className="flex-[0.33] bg-gradient-to-b from-[#6c86a1] to-[#4a637d] text-white py-1.5 text-[12px] shadow-sm rounded-sm border border-[#4a637d] mr-[2px]">NC OMS</button>
                 <Interactive id="pay-btn-nc-transferencia" className="flex-[0.33]">
                     <button onClick={() => {
                        setAppState({ showNCTransferenciaModal: true, selectedPaymentMethod: 'NCTRANSF' });
                        handleInteract('pay-btn-nc-transferencia');
                     }} className="w-full h-full bg-gradient-to-b from-[#6c86a1] to-[#4a637d] text-white py-1.5 text-[12px] shadow-sm rounded-sm border border-[#4a637d]">NC TRANSFERENCIA</button>
                 </Interactive>
              </div>
           </div>
           )}
           
           {appState.selectedPaymentMethod === 'Efectivo' && (
                          <div className="bg-gradient-to-b from-[#14355c] to-[#0c2440] text-white p-2 text-[13px] font-bold shadow-inner">Pagos digitales</div>
                       )}
        </div>

        {/* Right Column - Totals */}
        <div className="flex-1 flex flex-col h-full">
           <div className="border border-gray-300 shadow-sm flex flex-col mb-2 h-[150px]">
              <div className="bg-gradient-to-b from-[#14355c] to-[#0c2440] border-b border-[#0a203a] text-white p-2 text-[13px] font-bold shadow-inner">Pagos</div>
              <div className="flex-1 p-2 bg-white overflow-y-auto">
                 {appState.payments.filter(p => p.amount > 0).map((p, i) => (
                    <div key={i} className="flex justify-between items-center text-[13px] border-b border-gray-200 py-1.5 text-[#333]">
                       <div className="flex items-center space-x-3">
                          <button onClick={() => anularPago(p)} className="bg-[#d9534f] text-white text-[11px] px-3 py-1 rounded shadow-sm border border-[#d43f3a]">Anular</button>
                          <span>{p.method}</span>
                       </div>
                       <span className="text-[#333]">S/.{p.amount.toFixed(2)}</span>
                    </div>
                 ))}
              </div>
           </div>

           <div className="border border-gray-300 shadow-sm flex flex-col mb-auto h-[150px]">
              <div className="bg-gradient-to-b from-[#14355c] to-[#0c2440] border-b border-[#0a203a] text-white p-2 text-[13px] font-bold shadow-inner">Vuelto</div>
              <div className="flex-1 p-2 bg-white overflow-y-auto">
                 {appState.vueltoGiven && parseFloat(vuelto) > 0 && (
                    <div className="flex justify-between items-center text-[13px] border-b border-gray-200 py-1.5 text-[#333]">
                       <div className="flex items-center space-x-3">
                          <button onClick={() => setAppState({ vueltoGiven: false })} className="bg-[#d9534f] text-white text-[11px] px-3 py-1 rounded shadow-sm border border-[#d43f3a]">Anular</button>
                          <span>Efectivo</span>
                       </div>
                       <span className="text-[#333]">S/.{vuelto}</span>
                    </div>
                 )}
                 {appState.payments.filter(p => p.amount < 0).map((p, i) => (
                    <div key={i} className="flex justify-between items-center text-[13px] border-b border-gray-200 py-1.5 text-[#333]">
                       <div className="flex items-center space-x-3">
                          <button onClick={() => anularPago(p)} className="bg-[#d9534f] text-white text-[11px] px-3 py-1 rounded shadow-sm border border-[#d43f3a]">Anular</button>
                          <span className="whitespace-pre-line">{p.method}</span>
                       </div>
                       <span className="text-[#333]">S/.{Math.abs(p.amount).toFixed(2)}</span>
                    </div>
                 ))}
              </div>
           </div>

           <div className="flex flex-col items-end space-y-[2px] text-[12px] mt-4 mb-2 mr-[14px]">
              <div className="flex items-center"><span className="w-[120px] text-right pr-2 font-bold text-[#333]">Total Documento</span><span className="bg-[#eeeeee] border border-[#cccccc] p-1 w-[120px] text-right text-[#333]">{totalDoc < 0 ? `-S/.${Math.abs(totalDoc).toFixed(2)}` : `S/.${totalDoc.toFixed(2)}`}</span></div>
              <div className="flex items-center"><span className="w-[120px] text-right pr-2 font-bold text-[#333]">Efectivo Cobrar</span><span className="bg-[#eeeeee] border border-[#cccccc] p-1 w-[120px] text-right text-[#333]">S/.{Number(pending) < 0 ? '0.00' : pending}</span></div>
              <div className="flex items-center"><span className="w-[120px] text-right pr-2 font-bold text-[#333]">Vuelto Dar</span><span className="bg-[#eeeeee] border border-[#cccccc] p-1 w-[120px] text-right text-[#333]">S/.{vuelto}</span></div>
              <div className="flex items-center"><span className="w-[120px] text-right pr-2 font-bold text-[#333]">Redondeo</span><span className="bg-[#eeeeee] border border-[#cccccc] p-1 w-[120px] text-right text-[#333]">S/.0.00</span></div>
           </div>
        </div>
      </div>

      <div className="flex-none h-[36px] bg-gradient-to-b from-[#3a3a3a] via-[#1a1a1a] to-[#000000] border-t border-[#555] grid grid-cols-4 w-full">
         <div className="flex items-center justify-center text-[#ccc] text-[13px] font-bold border-r border-[#444] cursor-pointer hover:bg-white/5">← Regresar</div>
         <div className="flex items-center justify-center text-[#ccc] text-[13px] font-bold border-r border-[#444] cursor-pointer hover:bg-white/5">Ticket Regalo</div>
         <Interactive id={isComplete ? 'pay-btn-print-update' : 'ignore-click'} className="w-full h-full">
            <div onClick={() => isComplete && handleInteract('pay-btn-print-update')} className={`w-full h-full flex items-center justify-center text-[13px] font-bold border-r border-[#444] transition-colors ${isComplete ? 'text-[#ccc] cursor-pointer hover:bg-white/5' : 'text-gray-600 cursor-not-allowed bg-black/50'}`}>Imprimir Actualizar</div>
         </Interactive>
         <Interactive id={isComplete ? 'pay-btn-update-only' : 'ignore-click'} className="w-[150px]">
            <div onClick={() => isComplete && handleInteract('pay-btn-update-only')} className={`flex items-center justify-center text-[13px] font-bold h-full w-full transition-colors ${isComplete ? 'text-[#ccc] cursor-pointer hover:bg-white/5' : 'text-gray-600 cursor-not-allowed bg-black/50'}`}>Sólo Actualizar</div>
         </Interactive>
      </div>
    </div>
  );
};
