import * as fs from 'fs';
import * as path from 'path';

export function ends_with_mp_tracked_id(name: string): boolean {
  return name.endsWith('_mp_tracked_id');
}

export function is_http_url(source: string): boolean {
  return /^https?:\/\//i.test(source);
}

export function get_file_extension(file_path: string): string {
  return path.extname(file_path).toLowerCase().replace('.', '');
}

export function get_file_name_without_ext(file_path: string): string {
  return path.basename(file_path, path.extname(file_path));
}

export function file_exists(file_path: string): boolean {
  return fs.existsSync(file_path);
}

export function ensure_directory_exists(dir_path: string): void {
  if (!fs.existsSync(dir_path)) {
    fs.mkdirSync(dir_path, { recursive: true });
  }
}