export function Field({ label, children }){
  return (
    <label className="text-sm text-n8n-soft flex flex-col gap-2">
      <span>{label}</span>
      {children}
    </label>
  );
}