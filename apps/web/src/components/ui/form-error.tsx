/**
 * Form-level error (DESIGN.md "Inline (form)"): one line above the fields, Eosin
 * text with the "!" glyph. Announced at once; field errors stay on their fields.
 */
export function FormError({ message }: { message: string | null }) {
  return (
    <div role="alert" aria-live="assertive">
      {message && (
        <p className="flex gap-1.5 text-body text-eosin-text">
          <span aria-hidden="true" className="font-semibold">
            !
          </span>
          <span>{message}</span>
        </p>
      )}
    </div>
  );
}
