import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from 'flowbite-react';
import { toast } from 'react-toastify';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import { parse as dateFnsParse, format } from 'date-fns';


interface Patient {
    userID: string;
    patientID: string;
    patientName: string;
    patientDOB: string;
    patientGender: string;
    patientZipCode: string;
    providers: string;
    providerURL: string;
    treatmentDate: string;
    startTime: string;
    endTime: string;
    features: string;
}

interface PatientsData {

    eCW: Patient[];
    AMD: Patient[];
    Quest: Patient[];
    Behavidance: Patient[];
}

const PatientList: React.FC = () => {


    const [patients, setPatients] = useState<PatientsData>({
        eCW: [],
        AMD: [],
        Quest: [],
        Behavidance: []
    });
    const [searchName, setSearchName] = useState<string>('');
    const [searchDOB, setSearchDOB] = useState<string>('');
    const [searchGender, setSearchGender] = useState<string>('');
    const [searchZipCode, setSearchZipCode] = useState<string>('');
    const [selectedPatients, setSelectedPatients] = useState<Patient[]>([]);
    const [mergedPatient, setMergedPatient] = useState<Patient | null>(null);
    const [showAdvancedSearch, setShowAdvancedSearch] = useState<boolean>(false);
    const [filteredPatients, setFilteredPatients] = useState<PatientsData | null>(null);
    const [selectedPlatform, setSelectedPlatform] = useState<string>('All');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [fileInputs, setFileInputs] = useState<{ [key: string]: File | null }>({
        eCW: null,
        AMD: null,
        Quest: null,
        Behavidance: null
    });
    const [fileNames, setFileNames] = useState<{ [key: string]: string }>({});
    const [platformToUpload, setPlatformToUpload] = useState<string | null>(null);


    const platforms = ['All', 'eCW', 'AMD', 'Quest', 'Behavidance'];



    useEffect(() => {
        axios.get('/patients.json')
            .then(response => {

                setPatients(response.data);
                setFilteredPatients(response.data);
            })
            .catch(error => {
                console.error('Error fetching patients:', error);
            });
    }, []);


    const normalizeDate = (dateString: string | null | undefined): string => {
        if (!dateString || dateString.trim() === '') {
            return '';
        }
        try {
            const parsedDate = dateFnsParse(dateString, 'yyyy-MM-dd', new Date());
            if (isNaN(parsedDate.getTime())) {
                return '';
            }
            return format(parsedDate, 'yyyy-MM-dd');
        } catch (error) {
            return '';
        }
    };


    const searchPatients = () => {
        if (!patients) return;

        setMergedPatient(null);


        const allPatients = [
            ...patients.eCW,
            ...patients.AMD,
            ...patients.Quest,
            ...patients.Behavidance
        ];


        const normalizedSearchDOB = normalizeDate(searchDOB);
        const normalizedStartDate = normalizeDate(startDate);
        const normalizedEndDate = normalizeDate(endDate);



        const matchingPatients = allPatients.filter(patient => {

            const normalizedPatientDOB = normalizeDate(patient.patientDOB);

            const treatmentDate = normalizeDate(patient.treatmentDate);

            const isDateInRange = (
                (!normalizedStartDate || !normalizedEndDate) ||
                (treatmentDate && treatmentDate >= normalizedStartDate && treatmentDate <= normalizedEndDate)
            );

            return (
                (searchName === '' || patient.patientName.toLowerCase().includes(searchName.toLowerCase())) &&
                (normalizedSearchDOB === '' || normalizedPatientDOB === normalizedSearchDOB) &&
                (searchGender === '' || patient.patientGender.toLowerCase() === searchGender.toLowerCase()) &&
                (searchZipCode === '' || patient.patientZipCode.includes(searchZipCode)) &&
                (selectedPlatform === 'All' || patient.providers.includes(selectedPlatform)) &&
                isDateInRange
            );
        });


        const filteredData: PatientsData = {
            eCW: matchingPatients.filter(p => p.providers.includes('eCW')),
            AMD: matchingPatients.filter(p => p.providers.includes('AMD')),
            Quest: matchingPatients.filter(p => p.providers.includes('Quest')),
            Behavidance: matchingPatients.filter(p => p.providers.includes('Behavidance')),
        };
        setFilteredPatients(filteredData);
    };

    const togglePatientSelection = (patient: Patient) => {
        if (selectedPatients.includes(patient)) {
            setSelectedPatients(selectedPatients.filter(p => p !== patient));
        } else {
            setSelectedPatients([...selectedPatients, patient]);
        }
    };

    const mergePatients = () => {
        if (selectedPatients.length > 0) {
            const uniquePatientNames = [...new Set(selectedPatients.map(p => p.patientName))];
            const mergedPatient = {
                userID: generateUniqueID(),
                patientID: selectedPatients.map(p => p.patientID).join(', '),
                patientName: uniquePatientNames.join(', '),
                patientDOB: selectedPatients[0].patientDOB,
                patientGender: selectedPatients[0].patientGender,
                patientZipCode: selectedPatients[0].patientZipCode,
                providers: selectedPatients.map(p => p.providers).join(', '),
                providerURL: selectedPatients.map(p => p.providerURL).join(', '),
                treatmentDate: new Date().toISOString().split('T')[0],
                startTime: new Date().toISOString(),
                endTime: new Date().toISOString(),
                features: selectedPatients.map(p => p.features).join(', ')
            };
            setMergedPatient(mergedPatient);


            setSelectedPatients([]);

        } else {
            setMergedPatient(null);
        }
    };

    const saveMergedPatient = () => {
        if (mergedPatient) {
            const blob = new Blob([JSON.stringify(mergedPatient, null, 2)], { type: 'application/json' });
            saveAs(blob, 'oonTop.json');
        } else {
            alert('No merged patient to save.');
        }

    };

    const exportToCSV = (data: Patient[]) => {
        try {
            const csv = Papa.unparse(data);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            saveAs(blob, 'oonTop.csv');
        } catch (error) {
            console.error('Failed to export CSV:', error);
        }
    };

    const handleExport = () => {
        if (mergedPatient) {
            exportToCSV([mergedPatient]);
        } else if (filteredPatients) {
            const allPatients = [
                ...filteredPatients.eCW,
                ...filteredPatients.AMD,
                ...filteredPatients.Quest,
                ...filteredPatients.Behavidance
            ];
            exportToCSV(allPatients);
        } else {
            alert('No patients to export.');
        }
    };



    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, platform: string) => {
        const file = event.target.files?.[0] || null;
        setFileInputs(prev => ({ ...prev, [platform]: file }));
        setFileNames(prev => ({ ...prev, [platform]: file ? file.name : 'No file selected' }));
        setPlatformToUpload(platform);

    };
    useEffect(() => {
        if (platformToUpload) {
            handleFileUpload(platformToUpload);
            setPlatformToUpload(null);
        }
    }, [platformToUpload, fileInputs]);

    const handleFileUpload = (platform: string) => {
        const file = fileInputs[platform];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result;
                if (typeof content === 'string') {
                    try {
                        const newPatients: Patient[] = JSON.parse(content);

                        setPatients(prev => {
                            if (!prev) return {
                                eCW: [],
                                AMD: [],
                                Quest: [],
                                Behavidance: []
                            };

                            const existingPatients = prev[platform];
                            const existingPatientIDs = new Set(existingPatients.map(p => p.patientID));
                            const uniqueNewPatients = newPatients.filter(p => !existingPatientIDs.has(p.patientID));

                            return {
                                ...prev,
                                [platform]: [
                                    ...existingPatients,
                                    ...uniqueNewPatients
                                ]
                            };

                        });

                        searchPatients();

                    } catch (error) {

                        toast.error(`Failed to parse JSON for ${platform}.`);
                    }
                }

            };
            reader.readAsText(file);

        } else {
            toast.error('File not selected!');
        }
    };



    const generateUniqueID = () => {
        return 'xxxxxx'.replace(/[x]/g, () => (Math.random() * 16 | 0).toString(16));
    };

    return (
        <div className=" max-w-screen-2xl mx-auto flex flex-row gap-4">
            <div className="w-1/5">
                <div className="flex flex-col gap-3">
                    <input
                        type="text"
                        value={searchName}
                        onChange={(e) => setSearchName(e.target.value)}
                        placeholder="Search by name"
                        className="py-2 px-6 border rounded-md"
                    />
                    {showAdvancedSearch && (
                        <>
                            <input
                                type="date"
                                value={searchDOB}
                                onChange={(e) => setSearchDOB(e.target.value)}
                                placeholder="Search by date of birth (YYYY-MM-DD)"
                                className="py-2 px-6 border rounded-md"
                            />
                            <input
                                type="text"
                                value={searchGender}
                                onChange={(e) => setSearchGender(e.target.value)}
                                placeholder="Search by gender"
                                className="py-2 px-6 border rounded-md"
                            />
                            <input
                                type="text"
                                value={searchZipCode}
                                onChange={(e) => setSearchZipCode(e.target.value)}
                                placeholder="Search by zip code"
                                className="py-2 px-6 border rounded-md"
                            />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                placeholder="Start Date"
                                className="py-2 px-6 border rounded-md"
                            />
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                placeholder="End Date"
                                className="py-2 px-6 border rounded-md"
                            />

                        </>
                    )}
                    <select
                        value={selectedPlatform}
                        onChange={(e) => setSelectedPlatform(e.target.value)}
                        className="py-2 px-4 border rounded-md"
                    >
                        {platforms.map((platform) => (
                            <option key={platform} value={platform}>
                                {platform}
                            </option>
                        ))}
                    </select>
                    <Button onClick={() => setShowAdvancedSearch(!showAdvancedSearch)} gradientDuoTone="blueToPurple" className="border">
                        {showAdvancedSearch ? 'Hide Advanced Search' : 'Show Advanced Search'}
                    </Button>
                    <Button onClick={searchPatients} gradientDuoTone="purpleToBlue" className="border">
                        Search
                    </Button>
                    <Button onClick={mergePatients} gradientDuoTone="purpleToBlue" className="border">
                        Merge
                    </Button>
                    <Button onClick={saveMergedPatient} gradientDuoTone="greenToBlue" className="border">
                        Save Merged
                    </Button>
                    <Button onClick={handleExport} gradientDuoTone="greenToBlue" className="border">
                        Export to CSV
                    </Button>

                </div>

                {mergedPatient && (
                    <div className=" my-6">
                        <h2 className='text-2xl font-semibold my-4'>Ontop-Health</h2>
                        <div className="flex flex-col gap-4">
                            <div className="border px-2 py-2 rounded-md">
                                <h3 className="font-semibold">Patient ID:</h3>
                                <p>{mergedPatient.patientID}</p>
                                <h3 className="font-semibold">Patient Name:</h3>
                                <p>{mergedPatient.patientName}</p>
                                <h3 className="font-semibold">Providers:</h3>
                                <p>{mergedPatient.providers}</p>
                                <h3 className="font-semibold">Providers:</h3>
                                <p>{mergedPatient.providers}</p>
                                <h3 className="font-semibold">Providers:</h3>
                                <p>{mergedPatient.providers}</p>
                                <h3 className="font-semibold">Provider URLs:</h3>
                                <p>{mergedPatient.providerURL}</p>
                                <h3 className="font-semibold">Patient New ID:</h3>
                                <p>{mergedPatient.userID}</p>
                            </div>

                        </div>
                    </div>
                )}


            </div>
            <div className="flex-1 overflow-auto ">
                <div className="flex flex-wrap border rounded-md ">
                    {filteredPatients && Object.keys(filteredPatients).map(groupKey => (
                        <div
                            key={groupKey}
                            className="border border-gray-200 rounded-lg  w-full xl:w-1/4 p-2 my-2 ">
                            <h2 className="text-xl font-semibold">{groupKey}</h2>
                            <div className="flex flex-col gap-2 max-h-[calc(80vh-8rem)] overflow-y-auto">
                                {filteredPatients[groupKey as keyof PatientsData].map(patient => (
                                    <div
                                        key={patient.patientID}
                                        className="border rounded-md p-4 flex justify-between items-center"
                                    >
                                        <div>
                                            <h3 className="font-semibold">{patient.patientName}</h3>
                                            <p>ID: {patient.patientID}</p>
                                            <p>DOB: {patient.patientDOB}</p>
                                            <p>Gender: {patient.patientGender}</p>
                                            <p>Zip Code: {patient.patientZipCode}</p>
                                            <p>Providers: {patient.providers}</p>
                                            <p>Provider URL: {patient.providerURL}</p>
                                            <p>Treatment Date: {patient.treatmentDate}</p>
                                            <p>Start Time: {patient.startTime}</p>
                                            <p>End Time: {patient.endTime}</p>
                                        </div>
                                        <div>
                                            <input
                                                type="checkbox"
                                                checked={selectedPatients.includes(patient)}
                                                onChange={() => togglePatientSelection(patient)}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                        </div>

                    ))}

                </div>
                <div className='flex flex-row gap-4 justify-center items-center mt-2'>
                    {platforms.slice(1).map(platform => (
                        <div key={platform} className="flex flex-col items-center p-4 border rounded-lg shadow-md ">
                            <input
                                id={`file-input-${platform}`}
                                type="file"
                                accept=".json"
                                onChange={(e) => handleFileChange(e, platform)}
                                className="hidden"
                            />
                            <label
                                htmlFor={`file-input-${platform}`}
                                className="mb-2 w-64  text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 cursor-pointer focus:outline-none flex items-center justify-center h-10 "
                            >
                                {fileNames[platform] || `Select ${platform} file`}
                            </label>
                            <Button
                                onClick={() => {
                                    handleFileUpload(platform);
                                    toast.success(`File uploaded successfully for ${platform}!`);
                                }}
                                gradientDuoTone="greenToBlue"
                                className="mt-2 w-full"
                                disabled={!fileInputs[platform]}
                            >
                                Load {platform} Data
                            </Button>
                        </div>
                    ))}
                </div>

            </div>

        </div>
    );

};

export default PatientList;


