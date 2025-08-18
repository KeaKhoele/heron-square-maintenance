export interface Issue {
  id: string;
  name: string;
  address: string;
  unit: string;
  description: string;
  urgency: 'High' | 'Medium' | 'Low';
  status: 'New' | 'In Process' | 'Complete';
  timestamp: string;
  userEmail: string;
}

export interface IssueFormData {
  name: string;
  address: string;
  unit: string;
  description: string;
  urgency: 'High' | 'Medium' | 'Low';
  userEmail: string;
}
