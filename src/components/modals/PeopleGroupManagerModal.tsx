// ruta: src/components/modals/PeopleGroupManagerModal.tsx
import React, { useState, FormEvent } from 'react';
import { saveAs } from 'file-saver';
import { useEventData } from '../../contexts/EventDataContext';
import { PersonGroup } from '../../types';
import { TrashIcon, EditIcon } from '../../constants';

interface PeopleGroupManagerProps {
  onClose: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

const PeopleGroupManagerModal: React.FC<PeopleGroupManagerProps> = ({ onClose, showToast }) => {
  const { peopleGroups, addPersonGroup, updatePersonGroup, deletePersonGroup: deletePersonGroupContext } = useEventData();
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [tel1, setTel1] = useState('');
  const [tel2, setTel2] = useState('');
  const [email, setEmail] = useState('');
  const [web, setWeb] = useState('');
  const [notes, setNotes] = useState('');
  const [editingPerson, setEditingPerson] = useState<PersonGroup | null>(null);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [search, setSearch] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  function normalize(str: string) {
    return str
      .toLocaleLowerCase('ca')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const filteredPeopleGroups = peopleGroups.filter(pg => {
    if (!search.trim()) return true;
    const s = normalize(search);
    return [pg.name, pg.role, pg.email, pg.tel1, pg.tel2]
      .filter(Boolean)
      .map(val => normalize(val!))
      .some(val => val.includes(s));
  });

  const commonInputClass = "mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:opacity-50";

  const resetForm = () => {
    setName('');
    setRole('');
    setTel1('');
    setTel2('');
    setEmail('');
    setWeb('');
    setNotes('');
    setEditingPerson(null);
    setErrors({});
  };

  const handleEdit = (person: PersonGroup) => {
    setEditingPerson(person);
    setName(person.name);
    setRole(person.role || '');
    setTel1(person.tel1 || '');
    setTel2(person.tel2 || '');
    setEmail(person.email || '');
    setWeb(person.web || '');
    setNotes(person.notes || '');
    setErrors({});
  };

  const validate = (): boolean => {
    const newErrors: {[key: string]: string} = {};
    if (!name.trim()) newErrors.name = "El nom és obligatori.";
    const isDuplicate = peopleGroups.some(pg =>
        pg.name.trim().toLowerCase() === name.trim().toLowerCase() &&
        (!editingPerson || pg.id !== editingPerson.id)
    );
    if (isDuplicate) newErrors.name = "Ja existeix una persona/grup amb aquest nom.";

    if (email && !email.includes('@')) {
      newErrors.email = "El format del correu electrònic no és vàlid.";
    }
    if (web && !/^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/.test(web) && !/^([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/.test(web)) {
      newErrors.web = "El format de la pàgina web no és vàlid.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if(!validate()) return;

    const personData: Omit<PersonGroup, 'id'> = {
        name: name.trim(),
        role: role.trim(),
        tel1: tel1.trim(),
        tel2: tel2.trim(),
        email: email.trim(),
        web: web.trim(),
        notes: notes.trim()
    };
    
    if (editingPerson) {
      updatePersonGroup({ ...editingPerson, ...personData });
      showToast("Persona/grup actualitzat.", 'success');
    } else {
      addPersonGroup(personData);
      showToast("Persona/grup afegit.", 'success');
    }
    resetForm();
  };

  const handleDeletePerson = (person: PersonGroup) => {
    setEditingPerson(person);
    setShowDeleteModal(true);
  };

  const handleDeleteFromEdit = () => {
    setShowDeleteModal(true);
  };

  const confirmActualDeletePerson = () => {
    if (editingPerson) {
      deletePersonGroupContext(editingPerson.id);
      showToast(`"${editingPerson.name}" eliminat/da.`, 'success');
      setShowDeleteModal(false);
      resetForm();
    }
  };

  const exportPeopleToCSV = () => {
    const header = ['Nom', 'Rol', 'Telèfon 1', 'Telèfon 2', 'Email', 'Web', 'Notes'];
    const rows = peopleGroups.map(p => [
      p.name || '',
      p.role || '',
      p.tel1 || '',
      p.tel2 || '',
      p.email || '',
      p.web || '',
      p.notes || ''
    ]);
    const csv = [header, ...rows]
      .map(row => row.map(field => '"' + String(field).replace(/"/g, '""') + '"').join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const today = new Date().toISOString().slice(0, 10);
    saveAs(blob, `llista_persones_${today}.csv`);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4 mb-6 p-4 border dark:border-gray-700 rounded-md" aria-labelledby="people-group-form-title">
        <div className="flex items-center justify-between mb-2">
          <h4 id="people-group-form-title" className="text-lg font-medium text-gray-800 dark:text-gray-200">{editingPerson ? 'Editar Persona/Grup' : 'Afegir Nova Persona/Grup'}</h4>
          {editingPerson && (
            <button
              type="button"
              onClick={handleDeleteFromEdit}
              title="Eliminar aquesta persona/grup"
              aria-label="Eliminar aquesta persona/grup"
              className="ml-2 p-2 rounded-full bg-red-100 hover:bg-red-200 dark:bg-red-700 dark:hover:bg-red-800 text-red-600 dark:text-red-200 transition-colors"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <label htmlFor="pg-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nom</label>
              <input type="text" id="pg-name" value={name} onChange={e => setName(e.target.value)} className={commonInputClass} required aria-required="true" />
              {errors.name && <p className="text-red-500 text-xs mt-1" role="alert">{errors.name}</p>}
            </div>
            <div>
              <label htmlFor="pg-role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Rol/Tipus (Opcional)</label>
              <input type="text" id="pg-role" value={role} onChange={e => setRole(e.target.value)} className={commonInputClass} />
            </div>
            <div>
              <label htmlFor="pg-tel1" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Telèfon 1 (Opcional)</label>
              <input type="tel" id="pg-tel1" value={tel1} onChange={e => setTel1(e.target.value)} className={commonInputClass} />
            </div>
            <div>
              <label htmlFor="pg-tel2" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Telèfon 2 (Opcional)</label>
              <input type="tel" id="pg-tel2" value={tel2} onChange={e => setTel2(e.target.value)} className={commonInputClass} />
            </div>
            <div>
              <label htmlFor="pg-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Correu Electrònic (Opcional)</label>
              <input type="email" id="pg-email" value={email} onChange={e => setEmail(e.target.value)} className={commonInputClass} />
              {errors.email && <p className="text-red-500 text-xs mt-1" role="alert">{errors.email}</p>}
            </div>
            <div>
              <label htmlFor="pg-web" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Pàgina Web (Opcional)</label>
              <input type="url" id="pg-web" value={web} onChange={e => setWeb(e.target.value)} className={commonInputClass} placeholder="https://exemple.com"/>
              {errors.web && <p className="text-red-500 text-xs mt-1" role="alert">{errors.web}</p>}
            </div>
        </div>
        <div className="col-span-1 md:col-span-2">
          <label htmlFor="pg-notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes (Opcional)</label>
          <textarea id="pg-notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={commonInputClass}></textarea>
        </div>
        <div className="flex justify-end space-x-2 pt-2">
          {editingPerson && <button type="button" onClick={resetForm} className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-md border border-gray-300 dark:border-gray-500">Cancel·lar Edició</button>}
          <button type="submit" className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md">{editingPerson ? 'Actualitzar' : 'Afegir'}</button>
        </div>
      </form>

      <div className="flex items-center justify-between mb-2">
        <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200">Llista de Persones/Grups</h4>
        <button type="button" onClick={exportPeopleToCSV} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md shadow">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Exportar a CSV
        </button>
      </div>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-gray-500 dark:text-gray-400">
          <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline align-middle"><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/></svg>
        </span>
        <input
          type="search"
          className="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="Cerca per nom, rol, email, tel..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Cercar persona o grup"
        />
      </div>
      {filteredPeopleGroups.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No hi ha persones o grups que coincideixin amb la cerca.</p>
      ) : (
        <ul className="space-y-2 max-h-60 overflow-y-auto" aria-label="Llista de persones i grups existents">
          {filteredPeopleGroups.map(p => (
            <li key={p.id} className="p-3 border dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700/60 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex-grow">
                    <span className="font-semibold text-gray-800 dark:text-gray-100">{p.name}</span>
                    {p.role && <p className="text-xs text-gray-600 dark:text-gray-300">Rol: {p.role}</p>}
                </div>
                <div className="space-x-2 flex-shrink-0">
                    <button onClick={() => handleEdit(p)} className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors" title={`Editar ${p.name}`} aria-label={`Editar ${p.name}`}><EditIcon className="w-4 h-4"/></button>
                    <button onClick={() => handleDeletePerson(p)} className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors" title={`Eliminar ${p.name}`} aria-label={`Eliminar ${p.name}`}><TrashIcon className="w-4 h-4"/></button>
                </div>
              </div>
              <div className="mt-1 text-xs space-y-0.5 text-gray-500 dark:text-gray-400">
                {(p.tel1 || p.tel2) && <p>Tel: {p.tel1}{p.tel1 && p.tel2 && " / "}{p.tel2}</p>}
                {p.email && <p>Email: <a href={`mailto:${p.email}`} className="text-blue-500 hover:underline">{p.email}</a></p>}
                {p.web && <p>Web: <a href={p.web.startsWith('http') ? p.web : `https://${p.web}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{p.web}</a></p>}
                {p.notes && <p className="mt-1 italic">Notes: {p.notes}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex justify-end pt-4 mt-4 border-t dark:border-gray-700">
         <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 rounded-md">Tancar</button>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">Confirmar Eliminació</h3>
            <p className="mb-6 text-gray-700 dark:text-gray-300">Segur que vols eliminar <span className="font-bold">{editingPerson?.name}</span>? Aquesta acció no es pot desfer.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-md border border-gray-300 dark:border-gray-500">Cancel·lar</button>
              <button onClick={confirmActualDeletePerson} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PeopleGroupManagerModal;