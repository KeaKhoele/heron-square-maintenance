export interface Issue {
  id: string;
  name: string;
  address: string;
  unit: string;
  category: 'Plumbing' | 'Electrical' | 'Appliances' | 'Structural' | 'General';
  issueType: string;
  description: string;
  urgency: 'High' | 'Medium' | 'Low';
  status: 'New' | 'In Process' | 'Complete';
  timestamp: string;
  userEmail: string;
  imageUrl?: string;
  statusHistory?: StatusHistoryEntry[];
  notes?: IssueNote[];
}

export interface StatusHistoryEntry {
  status: 'New' | 'In Process' | 'Complete';
  changedAt: string;
  changedBy: string;
}

export interface IssueNote {
  id: string;
  text: string;
  createdAt: string;
  createdBy: string;
  createdByName?: string;
}

export interface IssueFormData {
  name: string;
  address: string;
  unit: string;
  category: 'Plumbing' | 'Electrical' | 'Appliances' | 'Structural' | 'General';
  issueType: string;
  description: string;
  urgency: 'High' | 'Medium' | 'Low';
  userEmail: string;
  creatorUid?: string;
  imageFile?: File;
}
