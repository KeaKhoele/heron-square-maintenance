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
