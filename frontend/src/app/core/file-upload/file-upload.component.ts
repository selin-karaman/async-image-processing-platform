import { Component } from '@angular/core';
import { environment } from 'src/environment/environment.prod';

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss'],
})
export class FileUploadComponent {
  uploadedFiles: any[] = [];
  URL = '';

  constructor() {
    this.URL = environment.apiUrl;
  }

  onUpload(event: any) {
    for (const file of event.files) {
      this.uploadedFiles.push(file);
    }
  }
}
