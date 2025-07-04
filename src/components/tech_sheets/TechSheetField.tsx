import React from 'react';
interface TechSheetFieldProps {
id: string;
label: string;
value: string | number;
onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
type?: string;
placeholder?: string;
as?: 'input' | 'textarea';
rows?: number;
required?: boolean;
}
const TechSheetField: React.FC<TechSheetFieldProps> = ({
id,
label,
value,
onChange,
type = 'text',
placeholder = '',
as = 'input',
rows = 3,
required = false,
}) => {
const commonClasses = "mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm";
return (
<div className="w-full">
<label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
{label}
{required && <span className="text-red-500">*</span>}
</label>
{as === 'textarea' ? (
<textarea
id={id}
name={id}
value={value}
onChange={onChange}
placeholder={placeholder}
rows={rows}
className={commonClasses}
required={required}
/>
) : (
<input
type={type}
id={id}
name={id}
value={value}
onChange={onChange}
placeholder={placeholder}
className={commonClasses}
required={required}
/>
)}
</div>
);
};
export default TechSheetField;