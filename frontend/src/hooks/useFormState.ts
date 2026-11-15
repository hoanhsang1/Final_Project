import { useCallback, useRef, useState } from 'react';

/**
 * State form tối giản dùng chung cho các màn auth của MEMS.
 *
 * Vì sao tự viết thay vì `react-hook-form`/`zod`:
 * - Form của dự án nhỏ (1–7 trường), không có mảng động hay schema lồng nhau.
 * - Thêm hai thư viện chỉ để gom 4 state (`values/errors/touched/validating`)
 *   là cái giá không đáng, và kéo theo một ngôn ngữ khai báo thứ hai bên cạnh
 *   component của Astryx.
 *
 * Hợp đồng:
 * - `setValue` cập nhật giá trị; nếu trường đã `touch()` thì **chạy lại validator
 *   của trường đó ngay** để lỗi biến mất khi người dùng sửa.
 * - `validate` chạy **tất cả** validator, đánh dấu mọi trường đã chạm và trả
 *   `true` khi không còn lỗi. `onSubmit` của form gọi hàm này trước khi gửi API.
 * - `errorOf(key)` chỉ trả lỗi khi trường đã chạm — không mắng người dùng ngay
 *   từ ký tự đầu tiên.
 *
 * Validator nhận `(giá trị của trường, toàn bộ values)` nên kiểm tra chéo được
 * (mật khẩu nhập lại) mà không cần API riêng.
 */
export type FormErrors<T> = Partial<Record<keyof T, string>>;
export type FormTouched<T> = Partial<Record<keyof T, boolean>>;

export type FormValidators<T> = {
  [K in keyof T]?: (value: T[K], values: T) => string | null | undefined;
};

export interface FormState<T extends Record<string, unknown>> {
  values: T;
  errors: FormErrors<T>;
  touched: FormTouched<T>;
  setValue: <K extends keyof T>(key: K, value: T[K]) => void;
  touch: (key: keyof T) => void;
  validate: () => boolean;
  errorOf: (key: keyof T) => string | undefined;
  setError: (key: keyof T, message: string | null) => void;
  reset: (next?: T) => void;
}

export function useFormState<T extends Record<string, unknown>>(
  initialValues: T,
  validators: FormValidators<T> = {},
): FormState<T> {
  // Giữ bản gốc để `reset()` quay về đúng dữ liệu ban đầu, kể cả khi component
  // cha truyền một object mới mỗi lần render.
  const initialRef = useRef(initialValues);
  // Validator thường được khai inline trong component nên đổi identity mỗi
  // render; đọc qua ref để callback bên dưới không phải phụ thuộc vào nó.
  const validatorsRef = useRef(validators);
  validatorsRef.current = validators;

  const [values, setValues] = useState<T>(initialValues);
  const valuesRef = useRef(values);
  const [touched, setTouched] = useState<FormTouched<T>>({});
  const touchedRef = useRef<FormTouched<T>>({});
  const [errors, setErrors] = useState<FormErrors<T>>({});

  const runValidator = useCallback((key: keyof T, current: T) => {
    return validatorsRef.current[key]?.(current[key], current) ?? undefined;
  }, []);

  const setValue = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      const next = { ...valuesRef.current, [key]: value };
      valuesRef.current = next;
      setValues(next);

      if (touchedRef.current[key]) {
        setErrors((prev) => ({ ...prev, [key]: runValidator(key, next) }));
      }
    },
    [runValidator],
  );

  const touch = useCallback(
    (key: keyof T) => {
      if (!touchedRef.current[key]) {
        touchedRef.current = { ...touchedRef.current, [key]: true };
        setTouched(touchedRef.current);
      }
      setErrors((prev) => ({ ...prev, [key]: runValidator(key, valuesRef.current) }));
    },
    [runValidator],
  );

  const validate = useCallback(() => {
    const current = valuesRef.current;
    const nextErrors: FormErrors<T> = {};
    const nextTouched: FormTouched<T> = { ...touchedRef.current };

    for (const key of Object.keys(current) as (keyof T)[]) {
      nextTouched[key] = true;
      const message = runValidator(key, current);
      if (message) nextErrors[key] = message;
    }

    touchedRef.current = nextTouched;
    setTouched(nextTouched);
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [runValidator]);

  const errorOf = useCallback(
    (key: keyof T) => (touched[key] ? errors[key] : undefined),
    [errors, touched],
  );

  /** Dùng khi BE trả lỗi gắn với một trường (vd email đã tồn tại). */
  const setError = useCallback((key: keyof T, message: string | null) => {
    touchedRef.current = { ...touchedRef.current, [key]: true };
    setTouched(touchedRef.current);
    setErrors((prev) => ({ ...prev, [key]: message ?? undefined }));
  }, []);

  const reset = useCallback((next?: T) => {
    const target = next ?? initialRef.current;
    valuesRef.current = target;
    touchedRef.current = {};
    setValues(target);
    setTouched({});
    setErrors({});
  }, []);

  return { values, errors, touched, setValue, touch, validate, errorOf, setError, reset };
}
