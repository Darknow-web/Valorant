import React, { useState } from 'react';
import { useSimulator } from '../store/SimulatorContext';
import { Interactive } from '../components/ui/Interactive';

export const ReturnsMainScreen: React.FC = () => {
  const { appState, handleInteract, setAppState, triggerCustomError } = useSimulator();
  const [docNumber, setDocNumber] = useState<string>('');
  const [showResults, setShowResults] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState<string>('Seleccionar...');
  const [returnMotivo, setReturnMotivo] = useState<string>('Select...');
  const [itemsToReturn, setItemsToReturn] = useState<any[]>([]);

  const transactions = showResults ? [
    { id: 'BA70-00003928', date: '7/30/2026 6:45:29 PM', customer: 'ELBA FARRO', doc: '116002997', total: '26.90', docType: '03-BOL ELECT' }
  ] : [];

  const transactionItems = [
    { id: 'item1', desc: 'DESENREDANTE SIN NUDOS C&P x L', ean: '7757067000735', price: 26.90, qty: 1 }
  ];

  return (
    <div className="absolute inset-0 bg-[#222222] flex flex-col text-[#333] text-[12px] font-sans">
      <div className="flex-1 flex flex-col p-2 space-y-2 overflow-hidden">
        {/* Top Row */}
        <div className="flex flex-1 space-x-2 overflow-hidden">
          {/* Filtro de Transacción */}
          <div className="w-[520px] bg-[#e6e6e6] border border-[#a0a0a0] flex flex-col">
            <div className="bg-[#0f3b6c] text-white px-2 py-1 font-bold">Filtro de Transacción</div>
            <div className="p-2 flex flex-col space-y-2 flex-1 overflow-y-auto">
              <div className="flex items-center">
                <div className="w-[130px] text-right pr-2 font-bold leading-tight">Desde Fecha</div>
                <div className="flex-1 flex border border-gray-400 bg-white">
                  <div className="bg-[#2b2b2b] p-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="white"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div>
                  <input type="text" className="w-full px-1 text-[11px] outline-none text-center" value="31 may. 2026 00:00:00" readOnly />
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-[130px] text-right pr-2 font-bold leading-tight">Hasta Fecha</div>
                <div className="flex-1 flex border border-gray-400 bg-white">
                  <div className="bg-[#2b2b2b] p-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="white"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div>
                  <input type="text" className="w-full px-1 text-[11px] outline-none text-center" value="30 jul. 2026 23:59:59" readOnly />
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-[130px] text-right pr-2 font-bold leading-tight">No. Documento</div>
                <input type="text" className="flex-1 border border-gray-400 bg-white px-1 py-0.5 outline-none" value={docNumber} onChange={(e) => setDocNumber(e.target.value)} />
              </div>
              <div className="flex items-center">
                <div className="w-[130px] text-right pr-2 font-bold leading-tight">Nombre del cliente</div>
                <input type="text" className="flex-1 border border-gray-400 bg-white px-1 py-0.5 outline-none" />
              </div>
              <div className="flex items-center">
                <div className="w-[130px] text-right pr-2 font-bold leading-tight">Apellido del Cliente</div>
                <input type="text" className="flex-1 border border-gray-400 bg-white px-1 py-0.5 outline-none" />
              </div>
            </div>
            <div className="bg-[#dcdcdc] p-1.5 flex justify-end space-x-1 border-t border-gray-400">
               <Interactive id={(!docNumber || docNumber.trim() !== 'BA70-00003928') ? 'ignore-click' : 'ret-btn-buscar'}>
                  <button 
                    onClick={() => { 
                      if (!docNumber || docNumber.trim() !== 'BA70-00003928') {
                        triggerCustomError('Debe ingresar el número de documento correcto (BA70-00003928).');
                        return;
                      }
                      setShowResults(true); 
                    }} 
                    className="bg-[#0f3b6c] text-white px-4 py-1 font-bold hover:brightness-110"
                  >
                    Buscar
                  </button>
               </Interactive>
               <button className="bg-[#0f3b6c] text-white px-4 py-1 font-bold hover:brightness-110">Reinicializar</button>
            </div>
          </div>

          {/* Transacciones */}
          <div className="flex-1 bg-[#e6e6e6] border border-[#a0a0a0] flex flex-col">
            <div className="bg-[#0f3b6c] text-white px-2 py-1 font-bold flex justify-between">
              <span>Transacciones</span>
              <span>Seleccione la transacción con los artículos a devolver</span>
            </div>
            <div className="flex-1 bg-white overflow-y-auto">
              {transactions.map(t => (
                <Interactive id={`ret-txn-${t.id}`} key={t.id}>
                  <div 
                    onClick={() => { setSelectedTransaction(t.id); }}
                    className={`p-2 border-b border-gray-300 cursor-pointer text-[11px] flex ${selectedTransaction === t.id ? 'bg-[#4076a5] text-white' : 'hover:bg-blue-50'}`}
                  >
                    <div className="w-1/3">
                      <div className="font-bold">No. Transacción <span className="font-normal">{t.id}</span></div>
                      <div>{t.docType}</div>
                      <div className="font-bold">Fecha de Transacción <span className="font-normal">{t.date}</span></div>
                    </div>
                    <div className="w-1/3">
                      <div className="font-bold">Desde Central <input type="checkbox" checked readOnly className="ml-1" /></div>
                      <div className="font-bold">Total <span className="font-normal">S/.{t.total}</span></div>
                    </div>
                    <div className="w-1/3">
                      <div className="font-bold">Cliente <span className="font-normal">{t.customer}</span></div>
                    </div>
                  </div>
                </Interactive>
              ))}
            </div>
            <div className="bg-[#dcdcdc] p-1.5 h-[36px] flex justify-end space-x-1 border-t border-gray-400"></div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="flex flex-1 space-x-2 overflow-hidden">
          {/* Detalles de Devolución */}
          <div className="w-[520px] bg-[#e6e6e6] border border-[#a0a0a0] flex flex-col">
            <div className="bg-[#0f3b6c] text-white px-2 py-1 font-bold">Detalles de Devolución</div>
            <div className="p-2 flex flex-col space-y-4 flex-1 overflow-y-auto bg-white text-[11px]">
               <div className="grid grid-cols-2 gap-4 font-bold px-4">
                  <div className="text-right">Cantidad Transacción &nbsp;{selectedTransaction ? '0' : '2'}</div>
                  <div className="text-right pr-4">Cantidad Disponible &nbsp;{selectedTransaction ? '0' : '2'}</div>
                  <div className="text-right">Cantidad Total de Devolución &nbsp;{itemsToReturn.length}</div>
                  <div className="text-right pr-4">Monto Total de Devolución &nbsp;S/.{itemsToReturn.reduce((sum, item) => sum + item.price, 0).toFixed(2)}</div>
               </div>
               
               <div className="flex items-center pl-10 pr-4">
                  <div className="w-36 text-right pr-2 font-bold">Razones para Devolver</div>
                  <Interactive id="ret-reason-select" className="flex-1">
                     <select 
                        value={returnReason} 
                        onChange={(e) => { 
                           if (itemsToReturn.length === 0) {
                              triggerCustomError('Debe hacer clic en "Devolver Artículo" antes de seleccionar la razón.');
                              return;
                           }
                           setReturnReason(e.target.value); 
                           handleInteract('ret-reason-select', e.target.value, true); 
                        }} 
                        className="w-full border border-gray-400 p-0.5 outline-none"
                     >
                        <option>Seleccionar...</option>
                        <option value="Cambio">Cambio</option>
                        <option value="Devo">Devo</option>
                     </select>
                  </Interactive>
               </div>
               <div className="flex items-center pl-10 pr-4">
                  <div className="w-36 text-right pr-2 font-bold">Motivo</div>
                  <Interactive id="ret-motivo-select" className="flex-1">
                     <select 
                        value={returnMotivo} 
                        onChange={(e) => { 
                           if (itemsToReturn.length === 0) {
                              triggerCustomError('Debe hacer clic en "Devolver Artículo" antes de seleccionar el motivo.');
                              return;
                           }
                           setReturnMotivo(e.target.value); 
                           if (e.target.value !== 'Select...') {
                              handleInteract('ret-motivo-select', e.target.value, true); 
                           }
                        }} 
                        className="w-full border border-gray-400 p-0.5 outline-none"
                     >
                        <option>Select...</option>
                        <option value="Garantía de satisfacción">Garantía de satisfacción</option>
                        <option value="Cambio de opinion">Cambio de opinion</option>
                     </select>
                  </Interactive>
               </div>
               <div className="flex justify-between items-center px-2 pt-4">
                  <div className="w-1/2 text-right pr-4 font-bold">Monto de tarifa disponible &nbsp;S/.0.00</div>
                  <div className="w-1/2 flex justify-end items-center space-x-2 pr-4">
                     <span className="font-bold">Importe de la tarifa de devolución</span>
                     <input type="text" className="w-16 border border-gray-400 bg-[#e0e0e0]" readOnly />
                  </div>
               </div>
            </div>
            <div className="bg-[#dcdcdc] p-1.5 h-[36px] flex justify-end space-x-1 border-t border-gray-400"></div>
          </div>

          {/* Artículos de Transacción */}
          <div className="flex-1 bg-[#e6e6e6] border border-[#a0a0a0] flex flex-col">
            <div className="bg-[#0f3b6c] text-white px-2 py-1 font-bold flex justify-between">
              <span>Artículos de Transacción</span>
              <span>Haga clic en el (los) artículo(s) para ser devueltos</span>
            </div>
            <div className="flex-1 bg-white overflow-y-auto">
               {selectedTransaction && transactionItems.map(item => (
                  <Interactive id={`ret-item-${item.id}`} key={item.id}>
                     <div 
                        onClick={() => {
                           if (itemsToReturn.find(i => i.id === item.id)) {
                              // already selected for return
                           } else {
                              setSelectedItem(item.id);
                           }
                        }}
                        className={`p-2 border-b border-gray-300 cursor-pointer text-[11px] flex relative ${selectedItem === item.id ? 'bg-blue-100' : 'hover:bg-gray-50'}`}
                     >
                        <div className="w-[100px] font-bold space-y-0.5">
                           <div>Descripción 1</div>
                           <div>EAN</div>
                           <div>Tamaño</div>
                           <div>Atributo</div>
                        </div>
                        <div className="w-[200px] space-y-0.5">
                           <div className="truncate">{item.desc}</div>
                           <div>{item.ean}</div>
                        </div>
                        <div className="w-[150px] font-bold space-y-0.5">
                           <div>Tipo de Artículo <span className="font-normal pl-4">Venta</span></div>
                           <div>Cantidad <span className="font-normal pl-4">{item.qty}</span></div>
                           <div>Cantidad Disponible para Devolver <span className="font-normal pl-4">{itemsToReturn.find(i => i.id === item.id) ? '0' : item.qty}</span></div>
                        </div>
                        <div className="flex-1 font-bold space-y-0.5">
                           <div>Precio Venta <span className="font-normal float-right">S/.{item.price.toFixed(2)}</span></div>
                           <div>Precio de Venta Original <span className="font-normal float-right">S/.{item.price.toFixed(2)}</span></div>
                           <div>Valor de Devolución <span className="font-normal float-right">S/.{itemsToReturn.find(i => i.id === item.id) ? item.price.toFixed(2) : '0.00'}</span></div>
                           <div>Cantidad Devuelto <span className="font-normal float-right">{itemsToReturn.find(i => i.id === item.id) ? '1' : '0'}</span></div>
                        </div>
                        <div className="pl-4 pr-2 flex items-center">
                           <input type="checkbox" checked={!!itemsToReturn.find(i => i.id === item.id)} readOnly />
                        </div>
                     </div>
                  </Interactive>
               ))}
            </div>
            <div className="bg-[#dcdcdc] p-1.5 flex justify-end space-x-1 border-t border-gray-400">
               <Interactive id={!selectedItem ? 'ignore-click' : 'ret-btn-devolver-articulo'}>
                  <button 
                     onClick={() => {
                        if (!selectedItem) {
                           triggerCustomError('Debe seleccionar un artículo de la transacción primero.');
                           return;
                        }
                        const item = transactionItems.find(i => i.id === selectedItem);
                        if (item && !itemsToReturn.find(i => i.id === item.id)) {
                           setItemsToReturn([...itemsToReturn, item]);
                        }
                     }} 
                     className="bg-[#5c7a99] text-white px-3 py-1 font-bold hover:brightness-110"
                  >
                     Devolver Artículo
                  </button>
               </Interactive>
               <button className="bg-[#5c7a99] text-white px-3 py-1 font-bold hover:brightness-110">Borrar Artículo</button>
               <button className="bg-[#4076a5] text-white px-3 py-1 font-bold hover:brightness-110">Seleccionar todo</button>
               <button className="bg-[#5c7a99] text-white px-3 py-1 font-bold hover:brightness-110">Borrar Todos</button>
            </div>
          </div>
        </div>
      </div>

      <div className="h-10 bg-[#1c1c1c] flex items-center justify-end pr-2 border-t border-black">
         <Interactive id={(itemsToReturn.length === 0 || returnReason === 'Seleccionar...' || returnMotivo === 'Select...') ? 'ignore-click' : 'ret-btn-regresar'}>
            <button 
               onClick={() => {
                  if (itemsToReturn.length === 0) {
                     triggerCustomError('Debe hacer clic en "Devolver Artículo" antes de regresar.');
                     return;
                  }
                  if (returnReason === 'Seleccionar...') {
                     triggerCustomError('Debe seleccionar una razón para devolver.');
                     return;
                  }
                  if (returnMotivo === 'Select...') {
                     triggerCustomError('Debe seleccionar un motivo.');
                     return;
                  }

                  const txn = transactions.find(t => t.id === selectedTransaction);
                  setAppState({ 
                     ...appState,
                     returnReason: returnMotivo !== 'Select...' ? returnMotivo : returnReason,
                     returnItems: itemsToReturn.map(i => ({ desc: i.desc, ean: i.ean, price: -i.price })),
                     cart: [...appState.cart, ...itemsToReturn.map(i => ({ desc: i.desc, ean: i.ean, price: -i.price, type: 'Devolución' }))],
                     currentCustomer: txn ? {
                        rut: '',
                        doc: txn.doc,
                        name: txn.customer,
                        email: '',
                        phone: '',
                        address: '',
                        loyaltyId: ''
                     } : appState.currentCustomer
                  });
               }} 
               className="bg-gradient-to-b from-[#333] to-[#111] border border-black text-white font-bold px-4 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] hover:brightness-110"
            >
               Regresar al Documento
            </button>
         </Interactive>
      </div>


    </div>
  );
};
