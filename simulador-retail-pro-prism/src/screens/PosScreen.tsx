import React, { useState } from 'react';
import { PrismHeader, PrismTab, PrismFooter as PrismFooterOld, PrismButtonPrimary, PrismButtonDark } from '../components/ui/PrismUI';
import { Interactive } from '../components/ui/Interactive';
import { useSimulator } from '../store/SimulatorContext';
import { Icons } from '../config/icons';
import { findCustomer, findProduct } from '../data/catalog';

export const PosMainScreen = () => {
  const [activeTab, setActiveTab] = React.useState('Venta');
  const { appState, setAppState, handleInteract, currentModuleId, catalog, triggerCustomError } = useSimulator();
  const [itemSearchStr, setItemSearchStr] = useState('');
  const [custSearchStr, setCustSearchStr] = useState('');

  // El producto y el cliente se buscan en el catálogo que configuró el
  // entrenador. Antes se buscaban en listas fijas del código, así que al
  // cambiar un SKU o un documento la búsqueda no encontraba nada y el módulo
  // quedaba bloqueado aunque el colaborador escribiera el valor correcto.
  const buscarProducto = (code: string) => {
    const prod = findProduct(catalog, code);
    if (!prod) {
      triggerCustomError(`No se encontró ningún artículo con el código ${code.trim()}.`);
      return false;
    }
    const newProd = { ...prod };
    if (appState.priceLevelActive) newProd.price = newProd.price * 1.05;
    setAppState({ cart: [...appState.cart, newProd] });
    return true;
  };

  const buscarCliente = (doc: string) => {
    const customer = findCustomer(catalog, doc);
    if (!customer) {
      triggerCustomError(`No se encontró ningún cliente con el documento ${doc.trim()}.`);
      return false;
    }
    if (customer.esAgregador) {
      setAppState({ pendingCustomer: customer, showPriceLevelModal: true, applyPriceLevelToExisting: false });
    } else {
      setAppState({ currentCustomer: customer });
    }
    return true;
  };

  const numericTotal = appState.cart.reduce((sum, item) => sum + item.price, 0);
  const formattedTotal = numericTotal < 0 ? `-S/.${Math.abs(numericTotal).toFixed(2)}` : `S/.${numericTotal.toFixed(2)}`;

  return (
    <div className="relative w-full min-h-full flex flex-col bg-[#222222]">
      {/* Top Black Logo Bar */}
      <div className="h-[32px] px-2 flex items-center bg-[#222222] shrink-0 border-b border-[#111]">
        <img src="https://firebasestorage.googleapis.com/v0/b/simulador-retail-pro.firebasestorage.app/o/Modulo%203%20ventana%20de%20venta%2FLogo%20con%20p%20blanca.png?alt=media" alt="Retail Pro Logo" className="h-[22px] object-contain ml-1" />
      </div>
      {appState.showNewCustomerModal && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-[600px] max-h-[95%] rounded-sm shadow-[0_0_20px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden border border-[#333]">
             <div className="bg-gradient-to-b from-[#1b4b7a] to-[#0f2c4a] text-white px-4 py-2.5 text-[15px] font-sans shadow-sm font-bold flex justify-between items-center shrink-0">
               <span>Crear Cliente</span>
             </div>
             <div className="p-4 overflow-y-auto flex-1 flex flex-col space-y-4 bg-white text-[13px] text-[#333]">
                <div className="flex space-x-4">
                  <div className="flex-1 flex flex-col">
                    <label className="font-bold mb-1">Nombre</label>
                    <Interactive id="cust-new-name">
                       <input type="text" value={appState.newCustomerName || ''} onChange={(e) => { setAppState({ newCustomerName: e.target.value }); handleInteract('cust-new-name', e.target.value); }} className="w-full border border-red-500 p-1.5 focus:outline-none" />
                    </Interactive>
                  </div>
                  <div className="flex-1 flex flex-col">
                    <label className="font-bold mb-1">Apellido</label>
                    <Interactive id="cust-new-lastname">
                       <input type="text" value={appState.newCustomerLastName || ''} onChange={(e) => { setAppState({ newCustomerLastName: e.target.value }); handleInteract('cust-new-lastname', e.target.value); }} className="w-full border border-red-500 p-1.5 focus:outline-none" />
                    </Interactive>
                  </div>
                </div>
                <div className="flex flex-col">
                  <label className="font-bold mb-1">Email</label>
                  <Interactive id="cust-new-email">
                     <input type="email" value={appState.newCustomerEmail || ''} onChange={(e) => { setAppState({ newCustomerEmail: e.target.value }); handleInteract('cust-new-email', e.target.value); }} className="w-full border border-red-500 p-1.5 focus:outline-none" />
                  </Interactive>
                </div>
                <div className="flex flex-col">
                  <label className="font-bold mb-1">Número de documento de identidad</label>
                  <Interactive id="cust-new-doc">
                     <input type="text" value={appState.newCustomerDoc || ''} onChange={(e) => { setAppState({ newCustomerDoc: e.target.value }); handleInteract('cust-new-doc', e.target.value); }} className="w-full border border-red-500 p-1.5 focus:outline-none" />
                  </Interactive>
                </div>
                <div className="flex flex-col">
                  <label className="font-bold mb-1">Tipo de Documento:</label>
                  <Interactive id="cust-new-doctype">
                     <select value={appState.newCustomerDocType || ''} onChange={(e) => { setAppState({ newCustomerDocType: e.target.value }); handleInteract('cust-new-doctype', e.target.value); }} className="w-full border border-red-500 p-1.5 focus:outline-none bg-white">
                        <option value=""></option>
                        <option value="DNI">DNI</option>
                        <option value="RUC">RUC</option>
                        <option value="Pasaporte">Pasaporte</option>
                     </select>
                  </Interactive>
                </div>
                
                <div className="flex flex-col"><label className="font-bold mb-1">Calle</label><input type="text" className="w-full border border-[#ccc] p-1.5 focus:outline-none" /></div>
                <div className="flex flex-col"><label className="font-bold mb-1">Número</label><input type="text" className="w-full border border-[#ccc] p-1.5 focus:outline-none" /></div>
                <div className="flex flex-col"><label className="font-bold mb-1">Ofic/Dept</label><input type="text" className="w-full border border-[#ccc] p-1.5 focus:outline-none" /></div>
                <div className="flex flex-col"><label className="font-bold mb-1">Comuna</label><input type="text" className="w-full border border-[#ccc] p-1.5 focus:outline-none" /></div>
                <div className="flex flex-col"><label className="font-bold mb-1">Ciudad</label><input type="text" className="w-full border border-[#ccc] p-1.5 focus:outline-none" /></div>
                <div className="flex flex-col"><label className="font-bold mb-1">Región</label><input type="text" className="w-full border border-[#ccc] p-1.5 focus:outline-none" /></div>
             </div>
             <div className="bg-white px-5 py-3 flex justify-end space-x-2 border-t border-gray-300 shrink-0">
                <Interactive id="cust-new-save">
                   <button 
                     disabled={!(appState.newCustomerName && appState.newCustomerLastName && appState.newCustomerEmail && appState.newCustomerDoc && appState.newCustomerDocType)}
                     onClick={() => {
                        handleInteract('cust-new-save');
                     }} 
                     className={`px-4 py-1.5 border border-black rounded-[5px] shadow-sm text-[13px] font-bold ${
                        (appState.newCustomerName && appState.newCustomerLastName && appState.newCustomerEmail && appState.newCustomerDoc && appState.newCustomerDocType) 
                        ? 'bg-[#666] text-white hover:bg-[#555]' 
                        : 'bg-gray-500 text-white opacity-80 cursor-not-allowed'
                     }`}>Guardar</button>
                </Interactive>
                <button onClick={() => setAppState({ showNewCustomerModal: false })} className="bg-gradient-to-b from-[#333] to-[#111] hover:from-[#444] hover:to-[#222] text-white px-4 py-1.5 border border-black rounded-[5px] shadow-sm text-[13px] font-bold">Cancelar</button>
             </div>
          </div>
        </div>
      )}

      {appState.showPriceLevelModal && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-start pt-[10vh] justify-center">
          <div className="bg-white w-[500px] rounded-sm shadow-[0_0_20px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden border border-[#333]">
             <div className="bg-gradient-to-b from-[#1b4b7a] to-[#0f2c4a] text-white px-4 py-2.5 text-[15px] font-sans shadow-sm font-bold">
               Customer Price Level (2719)
             </div>
             <div className="px-5 pt-3 pb-4 text-[14px] text-gray-800 bg-white flex flex-col space-y-4">
                <p>Use customers price level for this transaction? (2720)</p>
                <p>Price Level: (2721) Agrega</p>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="price-level-existing" checked={appState.applyPriceLevelToExisting || false} onChange={(e) => setAppState({ applyPriceLevelToExisting: e.target.checked })} />
                  <label htmlFor="price-level-existing">Change price level for existing items. (2722)</label>
                </div>
             </div>
             <div className="bg-white px-5 pb-3 flex justify-end space-x-2">
                <Interactive id="modal-price-level-yes">
                  <button onClick={() => {
                      let updatedCart = appState.cart;
                      if (appState.applyPriceLevelToExisting) {
                          updatedCart = appState.cart.map(c => ({...c, price: c.price * 1.05}));
                      }
                      setAppState({ 
                        priceLevelActive: true, 
                        currentCustomer: appState.pendingCustomer, 
                        showPriceLevelModal: false, 
                        pendingCustomer: null,
                        cart: updatedCart
                      });
                      handleInteract('modal-price-level-yes');
                  }} className="bg-gradient-to-b from-[#333] to-[#111] hover:from-[#444] hover:to-[#222] text-white px-4 py-1.5 border border-black rounded-[5px] shadow-sm text-[14px]">Sí</button>
                </Interactive>
                <button onClick={() => setAppState({ showPriceLevelModal: false, pendingCustomer: null })} className="bg-gradient-to-b from-[#333] to-[#111] hover:from-[#444] hover:to-[#222] text-white px-4 py-1.5 border border-black rounded-[5px] shadow-sm text-[14px]">No</button>
                <button onClick={() => setAppState({ showPriceLevelModal: false, pendingCustomer: null })} className="bg-gradient-to-b from-[#333] to-[#111] hover:from-[#444] hover:to-[#222] text-white px-4 py-1.5 border border-black rounded-[5px] shadow-sm text-[14px]">Cancelar</button>
             </div>
          </div>
        </div>
      )}

      {/* Modal Overlay for "Open Register" if needed */}
      {!appState.registerOpen && appState.fondoCaja === '' && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="bg-white w-[500px] border border-gray-600 shadow-2xl rounded shadow-[0_0_15px_rgba(0,0,0,0.5)]">
             <div className="bg-[#14355c] text-white p-2 text-lg font-bold">
               Registradora No esta Abierto
             </div>
             <div className="p-6 text-sm text-gray-800 bg-white">
                Una registradora no se ha abierto. ¿Le gustaría abrir un registrador?
             </div>
             <div className="bg-gray-100 p-3 flex justify-end space-x-2 border-t border-gray-300">
                <Interactive id="modal-register-yes">
                  <button className="bg-[#222] hover:bg-[#333] text-white px-6 py-1 border border-gray-500 rounded shadow-sm">Sí</button>
                </Interactive>
                <button className="bg-[#222] hover:bg-[#333] text-white px-6 py-1 border border-gray-500 rounded shadow-sm">No</button>
             </div>
          </div>
        </div>
      )}

      {/* Main POS Layout */}
      {appState.registerOpen && (
        <>
          <div className="flex-1 flex overflow-hidden relative pl-1 pr-2 py-2 bg-[#1a1a1a]">
            
            {/* Success Toast */}
            {appState.fondoCaja !== '' && currentModuleId === 'm2' && (
              <div className="absolute bottom-[20px] right-4 bg-[#5cb85c] text-white p-3 shadow-lg z-50 w-72 flex flex-col border border-[#4cae4c]">
                <div className="font-bold flex items-center space-x-2">
                    <div className="bg-black text-white px-1 font-extrabold font-serif">P</div>
                    <span>Exito</span>
                </div>
                <div className="text-[13px] mt-1">El monto actual de la registradora es {appState.fondoCaja} PEN.</div>
              </div>
            )}

            <div className="w-full h-full flex space-x-2">
              {/* Left Column */}
              <div className="flex-[3] flex flex-col bg-white border border-[#555] rounded-sm overflow-hidden">
                {/* Top section with Search and large box */}
                <div className="bg-[#444] p-1.5 flex space-x-1.5 border-b border-[#222]">
                  {/* Left side: Search and Tabs */}
                  <div className="flex-1 flex flex-col justify-between space-y-1.5">
                    {/* Search Bar */}
                    <div className="flex h-[32px]">
                      <Interactive id="pos-search-item" className="flex-1 h-full bg-white border border-[#222]">
                        <input type="text" placeholder="Búsqueda de Artículos" 
                            value={itemSearchStr}
                            onChange={(e) => {
                                setItemSearchStr(e.target.value);
                                handleInteract('pos-search-item', e.target.value);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                   const val = e.currentTarget.value;
                                   if (!buscarProducto(val)) return;
                                   handleInteract('pos-search-item', val, true);
                                   setItemSearchStr('');
                                }
                            }}
                            className="w-full h-full px-3 text-[14px] border-0 focus:outline-none placeholder:text-[#999] bg-transparent text-black" />
                      </Interactive>
                      <Interactive id="pos-search-item-btn" className="flex">
                         <button className="bg-gradient-to-b from-[#1c4e8a] to-[#0d3460] w-[40px] h-full flex items-center justify-center text-white border border-[#031326] shadow-sm ml-1"
                           onClick={() => {
                             const val = itemSearchStr;
                             if (!buscarProducto(val)) return;
                             handleInteract('pos-search-item', val, true);
                             setItemSearchStr('');
                           }}
                         >
                           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                             <circle cx="11" cy="11" r="8"></circle>
                             <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                           </svg>
                         </button>
                      </Interactive>
                    </div>
                    
                    {/* Tabs */}
                    <div className="flex h-[28px] border border-[#0a203a] shadow-sm relative">
                      <div onClick={() => setActiveTab('Venta')} className={`flex-1 flex items-center justify-center text-[13px] font-bold border-r border-[#0a203a] cursor-pointer ${activeTab === 'Venta' ? 'text-[#ffcc00] bg-gradient-to-b from-[#14355c] to-[#1b3a63]' : 'text-white bg-gradient-to-b from-[#1c4e8a] to-[#2a4d78]'}`}>Venta</div>
                      <div onClick={() => setActiveTab('Orden')} className={`flex-1 flex items-center justify-center text-[13px] font-bold border-r border-[#0a203a] cursor-pointer ${activeTab === 'Orden' ? 'text-[#ffcc00] bg-gradient-to-b from-[#14355c] to-[#1b3a63]' : 'text-white bg-gradient-to-b from-[#1c4e8a] to-[#2a4d78]'}`}>Orden</div>
                      <Interactive id="pos-tab-devolucion" className="flex-1 h-full">
                         <div onClick={() => { setActiveTab('Devolucion'); handleInteract('pos-tab-devolucion'); }} className={`w-full h-full flex items-center justify-center text-[13px] font-bold cursor-pointer ${activeTab === 'Devolucion' ? 'text-[#ffcc00] bg-gradient-to-b from-[#14355c] to-[#1b3a63]' : 'text-white bg-gradient-to-b from-[#1c4e8a] to-[#2a4d78]'}`}>Devolución</div>
                      </Interactive>
                      
                      {activeTab === 'Devolucion' && (
                         <div className="absolute top-[28px] right-0 w-1/3 bg-[#0a203a] border border-[#0a203a] shadow-md z-20 flex flex-col p-1 space-y-1">
                            <div className="bg-gradient-to-b from-[#14355c] to-[#0c2440] text-white text-[12px] font-bold py-1.5 px-3 cursor-pointer hover:brightness-125 border border-[#335985] text-center">
                               Establecer Tipo Art.
                            </div>
                            <Interactive id="pos-btn-buscar-doc">
                               <div onClick={() => handleInteract('pos-btn-buscar-doc')} className="bg-gradient-to-b from-[#14355c] to-[#0c2440] text-white text-[12px] font-bold py-1.5 px-3 cursor-pointer hover:brightness-125 border border-[#335985] text-center">
                                  Buscar Documento
                               </div>
                            </Interactive>
                         </div>
                      )}
                    </div>

                  </div>
                  
                  {/* Right side: Large Box Icon */}
                  <div className="w-[66px] h-[66px] bg-[#e5e5e5] border border-gray-400 flex items-center justify-center overflow-hidden flex-shrink-0">
                    <img src="https://firebasestorage.googleapis.com/v0/b/simulador-retail-pro.firebasestorage.app/o/Modulo%203%20ventana%20de%20venta%2FICONO%20DE%20CAJA.png?alt=media" alt="Caja" className="w-[85%] h-[85%] object-contain" />
                  </div>
                </div>

                <div className="flex-1 bg-white flex flex-col">
                   <div className="flex-1 overflow-y-auto">
                      {appState.cart.map((item, i) => (
                        <div key={i} className="mb-2 shadow-sm border border-[#999] m-2">
                           <div className="bg-white p-2 flex flex-col border-b border-[#ccc]">
                              <div className="flex justify-between">
                                 <div className="text-[13px] font-sans text-[#333] w-1/3">{item.desc}</div>
                                 <div className="text-[13px] font-sans text-[#333] font-bold w-1/3 text-center">EAN <span className="font-normal">{item.ean}</span></div>
                                 <div className="text-[13px] font-sans text-[#333] w-1/3 text-right">Tipo <span className="font-normal">{item.type || 'Venta'}</span></div>
                              </div>
                              <div className="flex mt-1">
                                 <div className="text-[13px] font-sans text-[#333] font-bold w-1/3">Cantidad <span className="font-normal">1</span></div>
                                 <div className="text-[13px] font-sans text-[#333] font-bold w-1/3 text-center">Precio Venta <span className="font-normal">S/.{item.price.toFixed(2)}</span></div>
                                 <div className="w-1/3"></div>
                              </div>
                           </div>
                           <div className="flex bg-[#0f3c6b] text-white text-[13px] font-sans font-medium h-[32px]">
                              <div className="flex-1 flex items-center justify-center border-r border-[#0a2c50] hover:bg-[#174f8a] cursor-pointer">Detalles</div>
                              <div className="flex-1 flex items-center justify-center border-r border-[#0a2c50] hover:bg-[#174f8a] cursor-pointer">Tipo de Artículo</div>
                              <div className="flex-1 flex items-center justify-center border-r border-[#0a2c50] hover:bg-[#174f8a] cursor-pointer">Descuentos</div>
                              <div className="flex-1 flex items-center justify-center border-r border-[#0a2c50] hover:bg-[#174f8a] cursor-pointer">Anular</div>
                              <Interactive id={`pos-btn-remove-${i}`} className="flex-1 flex"><div className="w-full h-full flex items-center justify-center border-r border-[#0a2c50] hover:bg-[#174f8a] cursor-pointer" onClick={() => {
                                 const newCart = [...appState.cart];
                                 newCart.splice(i, 1);
                                 setAppState({ cart: newCart });
                                 handleInteract('pos-btn-remove');
                              }}>Remover</div></Interactive>
                              <div className="flex-1 flex items-center justify-center hover:bg-[#174f8a] cursor-pointer">Cantidad</div>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="flex-[2] max-w-[420px] h-full bg-[#4a4a4a] border border-[#333] flex flex-col p-2 shadow-sm rounded-sm overflow-hidden">
                <div className="flex flex-col space-y-2 flex-1 overflow-y-auto">
                  {appState.currentCustomer ? (
                    <div className="flex h-[36px]">
                      <button className="bg-gradient-to-b from-[#1c4e8a] to-[#2a4d78] w-[40px] flex items-center justify-center text-white border border-[#0a203a] shadow-sm">
                        <span className="text-[12px]">▼</span>
                      </button>
                      <div className="flex-1 ml-1 bg-white border border-[#222] flex items-center px-2 text-[14px] text-black truncate">
                        {appState.currentCustomer.name}
                      </div>
                      <div className="flex">
                         <button className="bg-gradient-to-b from-[#1c4e8a] to-[#2a4d78] w-[40px] h-full flex items-center justify-center text-white border border-[#0a203a] ml-1 shadow-sm">
                           <span className="text-[14px]">🔍</span>
                         </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-[36px]">
                      <button className="bg-gradient-to-b from-[#1c4e8a] to-[#2a4d78] w-[40px] flex items-center justify-center text-white border border-[#0a203a] shadow-sm">
                        <span className="text-[12px]">▼</span>
                      </button>
                      <Interactive id="pos-search-customer" className="flex-1 ml-1 bg-white border border-[#222]">
                        <input type="text" placeholder="RUC / DNI" value={custSearchStr}
                          onChange={(e) => {
                            setCustSearchStr(e.target.value);
                            handleInteract('pos-search-customer', e.target.value);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                               const val = e.currentTarget.value;
                               if (!buscarCliente(val)) return;
                               handleInteract('pos-search-customer', val, true);
                               setCustSearchStr('');
                            }
                          }}
                          className="w-full h-full px-2 text-[14px] focus:outline-none text-black bg-transparent" />
                      </Interactive>
                      <Interactive id="pos-search-customer-btn" className="flex">
                         <button className="bg-gradient-to-b from-[#1c4e8a] to-[#2a4d78] w-[40px] h-full flex items-center justify-center text-white border border-[#0a203a] ml-1 shadow-sm"
                           onClick={() => {
                             const val = custSearchStr;
                             if (!buscarCliente(val)) return;
                             handleInteract('pos-search-customer', val, true);
                             setCustSearchStr('');
                           }}
                         >
                           <span className="text-[14px]">🔍</span>
                         </button>
                      </Interactive>
                    </div>
                  )}
                  
                  <div className="flex h-[34px] border border-[#0a203a]">
                    <Interactive id="pos-btn-new-cust" className="flex-1 flex">
                       <button onClick={() => { setAppState({ showNewCustomerModal: true }); handleInteract('pos-btn-new-cust'); }} className="flex-1 w-full h-full flex items-center justify-center text-white text-[13px] bg-gradient-to-b from-[#14355c] to-[#1b3a63] border-r border-[#0a203a] shadow-inner hover:brightness-110">Nuevo</button>
                    </Interactive>
                    <div className="flex-1 flex items-center justify-center text-gray-300 text-[13px] bg-[#445566] border-r border-[#0a203a] shadow-inner">Detalles</div>
                    <div className="flex-1 flex items-center justify-center text-gray-300 text-[13px] bg-[#445566] border-r border-[#0a203a] shadow-inner">Historial</div>
                    <Interactive id={appState.cart.some(item => item.price < 0) ? 'ignore-click' : 'pos-btn-remove-cust'} className="flex-1 flex">
                      <button 
                        className={`flex-1 w-full h-full flex items-center justify-center text-[13px] shadow-inner ${appState.cart.some(item => item.price < 0) ? 'text-gray-500 bg-[#334455] cursor-not-allowed' : 'text-gray-300 bg-[#445566] hover:bg-[#556677]'}`} 
                        onClick={() => { 
                          if (appState.cart.some(item => item.price < 0)) return;
                          setAppState({ currentCustomer: null }); 
                          handleInteract('pos-btn-remove-cust'); 
                        }}
                      >
                        Remover
                      </button>
                    </Interactive>
                  </div>

                  

                  <div className="bg-white border border-[#222] p-1.5 flex flex-col text-[12px] font-bold text-[#444] shadow-inner space-y-1">
                     <div className="flex items-center">
                        <span className="w-[120px] pl-1">COMPROBANTES</span>
                        <Interactive id="pos-select-comprobante" className="flex-1">
                          <select className="w-full border border-[#ccc] p-1 focus:outline-none text-[#333] text-[13px]" value={appState.comprobanteType} 
                             onChange={(e) => {
                                const val = e.target.value;
                                setAppState({ comprobanteType: val });
                                handleInteract('pos-select-comprobante', val, true);
                             }}>
                             <option>03-BOL ELECT</option>
                             <option>01-FACTURA</option>
                             <option>07-NOTA CRED ELECT</option>
                          </select>
                        </Interactive>
                     </div>
                     {appState.currentCustomer && appState.storeCredit > 0 && (
                        <div className="flex justify-between items-center px-1 font-normal text-[13px] border-t border-gray-200 pt-1">
                           <span>Crédito Tienda</span>
                           <span>S/.{appState.storeCredit.toFixed(2)}</span>
                        </div>
                     )}
                  </div>

                  <div className="flex space-x-1">
                     <button className="flex-1 bg-gradient-to-b from-[#14355c] to-[#0c2440] border border-[#0a203a] text-white py-2 text-[13px] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">Detalles de la Transacción</button>
                     <button className="flex-1 bg-gradient-to-b from-[#556677] to-[#3a4a5a] border border-[#2a3a4a] text-[#ddd] py-2 text-[13px] shadow-sm">Detalles de la Orden</button>
                  </div>

                  <div className="flex space-x-1">
                     <button className="flex-1 bg-gradient-to-b from-[#14355c] to-[#0c2440] border border-[#0a203a] text-white py-2 text-[13px] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">Cupones</button>
                     <div className="flex-1"></div>
                  </div>

                  <div className="bg-white border border-[#222] text-[12px] flex flex-col shadow-inner">
                     <div className="flex justify-between border-b border-[#e0e0e0] p-1.5 px-2"><span className="font-bold text-[#444]">Subsidiaria</span><span className="text-[#666]">Mascotas Peru</span></div>
                     <div className="flex justify-between border-b border-[#e0e0e0] p-1.5 px-2"><span className="font-bold text-[#444]">Tienda</span><span className="text-[#666]">MAIN</span></div>
                     <div className="flex justify-between border-b border-[#e0e0e0] p-1.5 px-2"><span className="font-bold text-[#444]">Cajero</span><span className="text-[#666]">{appState.user || 'sysadmin'}</span></div>
                     <div className="flex justify-between border-b border-[#e0e0e0] p-1.5 px-2"><span className="font-bold text-[#444]">Subtotal Venta</span><span className="text-[#666]">{formattedTotal}</span></div>
                     <div className="flex justify-between border-b border-[#e0e0e0] p-1.5 px-2"><span className="font-bold text-[#444]">Impuesto sobre las Ventas</span><span className="text-[#666]">S/.0.00</span></div>
                     <div className="flex justify-between border-b border-[#e0e0e0] p-1.5 px-2"><span className="font-bold text-[#444]">Cantidad de Linea</span><span className="text-[#666]">{appState.cart.length}</span></div>
                     <div className="flex justify-between p-1.5 px-2 font-bold"><span className="text-[#222]">Total de Transacción</span><span className="text-[#444]">{formattedTotal}</span></div>
                  </div>
                </div>

                <div className="mt-2 shrink-0 flex flex-col border border-[#222] rounded-sm overflow-hidden">
                  <div className="bg-black text-white text-[20px] text-right p-2 px-3 font-bold shadow-[inset_0_2px_5px_rgba(255,255,255,0.2)] leading-none">
                    {formattedTotal}
                  </div>
                  <Interactive id="pos-btn-pay">
                    <button onClick={() => {
                        if (appState.storeCredit > 0 && numericTotal > 0 && appState.currentCustomer) {
                           setAppState({ showStoreCreditModal: true });
                        }
                        handleInteract('pos-btn-pay');
                    }} className="w-full py-3 bg-gradient-to-b from-[#56a5e8] to-[#2470b5] text-white text-[15px] font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] hover:brightness-110 border-t border-[#1a558a]">
                      Pagar Transacción
                    </button>
                  </Interactive>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex-none h-[32px] bg-gradient-to-b from-[#3a3a3a] via-[#1a1a1a] to-[#000000] border-t border-[#555] flex z-10 w-full relative">
             <div className="flex flex-1">
                {['Nuevo', 'Guardar', 'Cancelar', 'Copiar', 'Venta en Espera', 'Imprimir', 'Opciones'].map((item, i) => (
                  <div key={i} className="flex-1 flex items-center justify-center text-[#ccc] text-[13px] font-bold border-r border-[#444] cursor-pointer hover:bg-white/5">
                     {item}
                  </div>
                ))}
             </div>
             <div className="h-full bg-gradient-to-b from-[#2a2a2a] to-[#111] px-4 cursor-pointer flex items-center justify-center min-w-[140px] border-l border-[#444] relative">
                <img src={Icons.retailProMenu} alt="Retail Pro" className="h-[22px] object-contain" />
                <div className="absolute bottom-1 right-1 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-transparent border-b-[#007acc] rotate-[135deg]"></div>
             </div>
          </div>
        </>
      )}
    </div>
  );
};