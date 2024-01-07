import { useEffect, useState } from 'react';
import { getDocs, collection } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { CompanyType } from '../utils/types';

// Define a type that includes both CompanyType and the document ID
type CompanyWithID = CompanyType & { id: string };

const DeveloperPage = () => {
  const [companies, setCompanies] = useState<CompanyWithID[]>([]);

  useEffect(() => {
    const fetchCompanies = async () => {
      const querySnapshot = await getDocs(collection(db, 'companies'));
      const companiesData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          companyName: data.companyName || [],
          admins: data.admins || [],
          employees: data.employees || [],
          statusPending: data.statusPending || [],
        };
      });
      setCompanies(companiesData);
    };

    fetchCompanies();
  }, []);

  return (
    <div>
      <h1>Companies</h1>
      {companies.map(company => (
        <div key={company.id}>
          <h2>{company.companyName.join(", ")}</h2>
          {/* Display employees and other details */}
        </div>
      ))}
    </div>
  );
};

export default DeveloperPage;


