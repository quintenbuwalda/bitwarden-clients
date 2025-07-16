import { Component, ElementRef, ViewChild, HostListener, OnInit } from '@angular/core';
import { SearchService } from '@bitwarden/common/vault/abstractions/search.service';
import { CipherService } from '@bitwarden/common/vault/abstractions/cipher.service';

@Component({
  selector: 'app-hotbar',
  templateUrl: './hotbar.component.html',
  styleUrls: ['./hotbar.component.scss']
})
export class HotbarComponent implements OnInit {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  search = '';
  items: any[] = [];
  selectedIndex = 0;
  loading = false;
  error: string | null = null;
  copiedType: 'username' | 'password' | 'totp' | null = null;

  constructor(private searchService: SearchService, private cipherService: CipherService) {}

  async ngOnInit() {
    await this.loadItems();
  }

  async loadItems() {
    this.loading = true;
    this.error = null;
    try {
      const results = await this.searchService.search(this.search || '', { includeSubfolders: true });
      this.items = (results || []).map((cipher: any) => ({
        id: cipher.id,
        name: cipher.name || cipher.login?.username || 'Unnamed',
        username: cipher.login?.username,
        password: cipher.login?.password,
        totp: cipher.login?.totp,
      }));
      this.selectedIndex = 0;
    } catch (e) {
      this.error = 'Failed to load items.';
    } finally {
      this.loading = false;
    }
  }

  get filteredItems() {
    if (!this.search) return this.items;
    return this.items.filter(item => (item.name || '').toLowerCase().includes(this.search.toLowerCase()));
  }

  selectNext() {
    if (this.selectedIndex < this.filteredItems.length - 1) this.selectedIndex++;
  }
  selectPrev() {
    if (this.selectedIndex > 0) this.selectedIndex--;
  }

  @HostListener('window:keydown', ['$event'])
  async handleKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown') { this.selectNext(); event.preventDefault(); return; }
    if (event.key === 'ArrowUp') { this.selectPrev(); event.preventDefault(); return; }
    if (event.metaKey || event.ctrlKey) {
      if (event.key === '1') { await this.copy('username'); event.preventDefault(); return; }
      if (event.key === '2') { await this.copy('password'); event.preventDefault(); return; }
      if (event.key === '3') { await this.copy('totp'); event.preventDefault(); return; }
    }
    // On any key, reload items if search changed
    if (event.key.length === 1 || event.key === 'Backspace' || event.key === 'Delete') {
      await this.loadItems();
    }
  }

  async copy(type: 'username' | 'password' | 'totp') {
    const item = this.filteredItems[this.selectedIndex];
    if (!item || !item[type]) return;
    this.copiedType = null;
    try {
      // Use secure clipboard IPC
      // @ts-ignore
      await window.ipc.platform.clipboard.write({ text: item[type], password: type === 'password' });
      this.copiedType = type;
      setTimeout(() => { this.copiedType = null; }, 1500);
    } catch (e) {
      this.error = 'Failed to copy to clipboard.';
    }
  }
}
