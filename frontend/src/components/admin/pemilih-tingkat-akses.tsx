'use client';

import { Globe2, UsersRound } from 'lucide-react';
import styles from './pemilih-tingkat-akses.module.css';

export function PemilihTingkatAkses({
  id,
  value,
  onValueChange,
}: {
  id: string;
  value: 'publik' | 'internal';
  onValueChange: (value: 'publik' | 'internal') => void;
}) {
  return (
    <fieldset className={styles.field}>
      <legend>Tingkat akses</legend>
      <div className={styles.control} data-access={value}>
        <span aria-hidden className={styles.indicator} />
        {(['publik', 'internal'] as const).map((access) => {
          const Icon = access === 'publik' ? Globe2 : UsersRound;
          return (
            <label key={access} className={styles.option}>
              <input
                className="sr-only"
                type="radio"
                name={id}
                value={access}
                checked={value === access}
                onChange={() => onValueChange(access)}
              />
              <Icon aria-hidden size={15} strokeWidth={1.7} />
              <span>{access === 'publik' ? 'Publik' : 'Dosen/Staf'}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
